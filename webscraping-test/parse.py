from bs4 import BeautifulSoup
import numpy as np

def open_html(path):
    with open("html/" + path, 'rb') as f:
        return f.read()
    

def print_html():
    html = open_html('google_com')
    soup = BeautifulSoup(html, 'html.parser')
    # print(soup)

    title = soup.select_one('h1').text
    text = soup.select_one('p').text
    link = soup.select_one('a').get('href')

    print(title)
    print(text)
    print(link)

def main():
    print_html()

if __name__ == "__main__":
    main()