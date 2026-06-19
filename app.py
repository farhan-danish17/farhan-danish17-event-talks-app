import os
import requests
import feedparser
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    try:
        # Fetch the feed XML
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
        
        # Parse XML with feedparser
        feed = feedparser.parse(response.content)
        
        parsed_entries = []
        
        for entry in feed.entries:
            # Extract basic fields
            title = entry.get('title', 'Unknown Date')
            updated = entry.get('updated', '')
            link = entry.get('link', '')
            
            # Content is typically in entry.content[0].value or entry.summary
            content_html = ""
            if 'content' in entry and len(entry.content) > 0:
                content_html = entry.content[0].value
            elif 'summary' in entry:
                content_html = entry.summary
                
            # Parse the content HTML to split by h3 tags (types of updates)
            soup = BeautifulSoup(content_html, 'html.parser')
            updates = []
            
            h3_tags = soup.find_all('h3')
            
            if not h3_tags:
                # Fallback: single update
                text_content = soup.get_text(separator=' ').strip()
                # Clean up multiple whitespaces
                text_content = " ".join(text_content.split())
                if text_content:
                    updates.append({
                        "type": "Update",
                        "html": content_html,
                        "text": text_content
                    })
            else:
                current_type = "Update"
                current_paragraphs = []
                
                for element in soup.contents:
                    if element.name == 'h3':
                        if current_paragraphs:
                            html_content = "".join(str(e) for e in current_paragraphs).strip()
                            if html_content:
                                temp_soup = BeautifulSoup(html_content, 'html.parser')
                                text_content = temp_soup.get_text(separator=' ').strip()
                                text_content = " ".join(text_content.split())
                                updates.append({
                                    "type": current_type,
                                    "html": html_content,
                                    "text": text_content
                                })
                            current_paragraphs = []
                        current_type = element.get_text(strip=True)
                    else:
                        current_paragraphs.append(element)
                
                # Append last item
                if current_paragraphs:
                    html_content = "".join(str(e) for e in current_paragraphs).strip()
                    if html_content:
                        temp_soup = BeautifulSoup(html_content, 'html.parser')
                        text_content = temp_soup.get_text(separator=' ').strip()
                        text_content = " ".join(text_content.split())
                        updates.append({
                            "type": current_type,
                            "html": html_content,
                            "text": text_content
                        })
            
            parsed_entries.append({
                "date": title,
                "updated": updated,
                "link": link,
                "updates": updates
            })
            
        return jsonify({
            "status": "success",
            "title": feed.feed.get('title', 'BigQuery Release Notes'),
            "entries": parsed_entries
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    # Run in debug mode on port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
