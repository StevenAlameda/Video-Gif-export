# Video to GIF Converter

A browser-based tool to convert video files to animated GIFs. Users can upload a video, set GIF parameters, preview, and download the result.

## Features
- Upload video files (MP4, WebM, MOV, etc.)
- Select start time, duration, frame rate, quality, and width
- Preview video before conversion
- Download animated GIF after conversion
- All processing is done in the browser (no server upload)

## Getting Started

### 1. Clone the repo
```
git clone <your-repo-url>
cd Video-Gif-export
```

### 2. Start a local server (Python 3)
```
python3 -m http.server 8000
```

### 3. Open in your browser
Go to [http://localhost:8000](http://localhost:8000)

## Project Structure
- `index.html` – Main HTML UI
- `styles.css` – Modern responsive styles
- `script.js` – App logic and GIF conversion
- `gif.worker.js` – GIF processing worker (required for gif.js)

## License
MIT
