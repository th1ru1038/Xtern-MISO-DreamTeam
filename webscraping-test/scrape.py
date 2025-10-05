import numpy as np
import requests


def save_html(html, path):
    with open("html/" + path, 'wb') as f:
        f.write(html)

def open_html(path):
    with open("html/" + path, 'rb') as f:
        return f.read()
    
        
        
def scrape():
    
    url = 'https://www.example.com'
    response = requests.get(url)
    save_html(response.content, 'google_com')





if __name__ == '__main__':
    scrape()
    # print_html()