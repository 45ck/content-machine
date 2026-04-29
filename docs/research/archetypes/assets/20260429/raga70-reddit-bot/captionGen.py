import os
import sys
import json
import wave
import urllib.request
import zipfile
import logging
import subprocess
from moviepy.editor import VideoFileClip, CompositeVideoClip, ImageClip
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from vosk import Model, KaldiRecognizer, SetLogLevel
import argparse


# Set up logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# Vosk model download function
# TODO small model can be used "vosk-model-small-en-us-0.15"
def download_vosk_model(model_name="vosk-model-en-us-0.22"):
    model_url = f"https://alphacephei.com/vosk/models/{model_name}.zip"
    model_path = os.path.join(os.path.dirname(__file__), model_name)
    
    if not os.path.exists(model_path):
        logging.info(f"Downloading Vosk model {model_name}...")
        zip_path, _ = urllib.request.urlretrieve(model_url)
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(os.path.dirname(__file__))
        os.remove(zip_path)
        logging.info("Model downloaded and extracted.")
    return model_path

def extract_audio(video_path, audio_path):
    if os.path.exists(audio_path):
        logging.info(f"File '{audio_path}' already exists. Overwriting...")
        os.remove(audio_path)
	
    command = [
        "ffmpeg",
        "-i", video_path,
        "-acodec", "pcm_s16le",
        "-ac", "1",
        "-ar", "16000",
        audio_path
    ]
    subprocess.run(command, check=True)
    logging.info(f"Audio extracted to {audio_path}")

def transcribe_audio(audio_path, model_path):
    SetLogLevel(0)
    wf = wave.open(audio_path, "rb")
    if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getcomptype() != "NONE":
        logging.error("Audio file must be WAV format mono PCM.")
        return []

    model = Model(model_path)
    rec = KaldiRecognizer(model, wf.getframerate())
    rec.SetWords(True)

    results = []
    while True:
        data = wf.readframes(4000)
        if len(data) == 0:
            break
        if rec.AcceptWaveform(data):
            part_result = json.loads(rec.Result())
            results.append(part_result)
    part_result = json.loads(rec.FinalResult())
    results.append(part_result)

    words = []
    for r in results:
        if 'result' in r:
            words.extend(r['result'])
    
    logging.info(f"Transcribed {len(words)} words")
    return words

def create_text_image(text, size, font_size, color, font_path, bg_color=(0, 0, 0, 0), border_size=15):
    # Increase the size of the image to accommodate the border
    increased_size = (size[0] + border_size * 2, size[1] + border_size * 2 + font_size // 2)
    img = Image.new('RGBA', increased_size, bg_color)
    draw = ImageDraw.Draw(img)
    
    # Load the main font
    font = ImageFont.truetype(font_path, font_size)
    
    # Calculate text position
    text_bbox = font.getbbox(text)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]
    position = ((increased_size[0] - text_width) // 2, (increased_size[1] - text_height) // 2)

    # Draw border
    for x_offset in range(-border_size, border_size + 1):
        for y_offset in range(-border_size, border_size + 1):
            draw.text((position[0] + x_offset, position[1] + y_offset), text, font=font, fill=(0, 0, 0, 255))  # Black border

    # Draw main text
    draw.text(position, text, font=font, fill=color)

    return np.array(img)




def create_caption_clips(word_timings, video_width, video_height, font_path):
    caption_clips = []
    font_size = 110  # Increased font size
    y_offset = 570  # Moving subtitles higher up on the screen

    for word in word_timings:
        img_array = create_text_image(word['word'], (video_width, 120), font_size, (255, 255, 255, 255), font_path)
        clip = ImageClip(img_array, duration=word['end'] - word['start'])
        
        # Adjusting position to move subtitles higher
        clip = clip.set_position(('center', video_height - y_offset)).set_start(word['start'])
        
        caption_clips.append(clip)
    
    logging.info(f"Created {len(caption_clips)} caption clips")
    return caption_clips



def main(input_video_path, output_video_path, font_path):
    # Download Vosk model if not present
    model_path = download_vosk_model()

    # Extract audio from video
    audio_path = "temp_audio.wav"
    extract_audio(input_video_path, audio_path)
    
    # Transcribe audio
    word_timings = transcribe_audio(audio_path, model_path)
    
    if not word_timings:
        logging.error("No words were transcribed. Check the audio quality and format.")
        return

    # Print first 10 transcribed words for debugging
    logging.info(f"First 10 transcribed words: {word_timings[:10]}")

    # Create caption clips
    video = VideoFileClip(input_video_path)
    caption_clips = create_caption_clips(word_timings, video.w, video.h, font_path)
    
    # Overlay captions on video
    final_video = CompositeVideoClip([video] + caption_clips)
    




    # Write output video
    final_video.write_videofile(output_video_path,)
    
    # Clean up temporary files
    os.remove(audio_path)
    logging.info("Video processing completed")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Add captions to video using Vosk and MoviePy.')
    parser.add_argument('input_video', type=str, help='Path to the input video file')
    parser.add_argument('--font', type=str, default='/home/user/RedditVideoMakerBot-master/fonts/Rubik-Black.ttf', help='Path to the font file')
    args = parser.parse_args()

    input_video = args.input_video
    output_video = os.path.splitext(input_video)[0] + "_out.mp4"
    font_path = args.font
    main(input_video, output_video, font_path)



