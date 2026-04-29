from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip
import re

def add_subtitles_to_video(input_video, output_video, transcriptions, video_start_time=0):
    """
    Add subtitles to video based on transcription segments.
    
    Args:
        input_video: Path to input video file
        output_video: Path to output video file
        transcriptions: List of [text, start, end] from transcribeAudio
        video_start_time: Start time offset if video was cropped
    """
    video = VideoFileClip(input_video)
    video_duration = video.duration
    
    # Filter transcriptions to only those within the video timeframe
    relevant_transcriptions = []
    for text, start, end in transcriptions:
        # Adjust times relative to video start
        adjusted_start = start - video_start_time
        adjusted_end = end - video_start_time
        
        # Only include if within video duration
        if adjusted_end > 0 and adjusted_start < video_duration:
            adjusted_start = max(0, adjusted_start)
            adjusted_end = min(video_duration, adjusted_end)
            relevant_transcriptions.append([text.strip(), adjusted_start, adjusted_end])
    
    if not relevant_transcriptions:
        print("No transcriptions found for this video segment")
        video.write_videofile(output_video, codec='libx264', audio_codec='aac')
        video.close()
        return
    
    # Create text clips for each transcription segment
    text_clips = []
    
    # Scale font size proportionally to video height (~6.5% of height)
    # 1080p → 70px, 720p → 47px
    dynamic_fontsize = int(video.h * 0.065)
    
    for text, start, end in relevant_transcriptions:
        # Clean up text
        text = text.strip()
        if not text:
            continue
            
        # Create text clip with styling
        txt_clip = TextClip(
            text,
            fontsize=dynamic_fontsize,
            color='#2699ff',
            stroke_color='black',
            stroke_width=2,
            font='Franklin-Gothic',
            method='caption',
            size=(video.w - 100, None)  # Leave 50px margin on each side
        )
        
        # Position at bottom center
        txt_clip = txt_clip.set_position(('center', video.h - txt_clip.h - 100))
        txt_clip = txt_clip.set_start(start)
        txt_clip = txt_clip.set_duration(end - start)
        
        text_clips.append(txt_clip)
    
    # Composite video with subtitles
    print(f"Adding {len(text_clips)} subtitle segments to video...")
    final_video = CompositeVideoClip([video] + text_clips)
    
    # Write output
    final_video.write_videofile(
        output_video,
        codec='libx264',
        audio_codec='aac',
        fps=video.fps,
        preset='medium',
        bitrate='3000k'
    )
    
    video.close()
    final_video.close()
    print(f"✓ Subtitles added successfully -> {output_video}")
