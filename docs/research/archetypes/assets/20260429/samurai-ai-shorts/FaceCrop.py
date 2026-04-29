import cv2
import numpy as np
from moviepy.editor import *
from Components.Speaker import detect_faces_and_speakers, Frames
global Fps

def crop_to_vertical(input_video_path, output_video_path):
    """Crop video to vertical 9:16 format with static face detection (no tracking)"""
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

    cap = cv2.VideoCapture(input_video_path, cv2.CAP_FFMPEG)
    if not cap.isOpened():
        print("Error: Could not open video.")
        return

    original_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    original_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    vertical_height = int(original_height)
    vertical_width = int(vertical_height * 9 / 16)
    # Ensure dimensions are even (required by many codecs)
    vertical_width = vertical_width - (vertical_width % 2)
    vertical_height = vertical_height - (vertical_height % 2)
    print(f"Output dimensions: {vertical_width}x{vertical_height}")

    if original_width < vertical_width:
        print("Error: Original video width is less than the desired vertical width.")
        return

    # Detect face position in first 30 frames to determine static crop position
    print("Detecting face position for static crop...")
    face_positions = []
    for i in range(min(30, total_frames)):
        ret, frame = cap.read()
        if not ret:
            break
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=8, minSize=(30, 30))
        if len(faces) > 0:
            # Get largest face
            best_face = max(faces, key=lambda f: f[2] * f[3])
            x, y, w, h = best_face
            face_center_x = x + w // 2
            face_positions.append(face_center_x)
    
    # Calculate static crop position
    if face_positions:
        # Use median face position for stability
        avg_face_x = int(sorted(face_positions)[len(face_positions) // 2])
        # Offset slightly to the right to prevent right-side cutoff
        avg_face_x += 60
        x_start = max(0, min(avg_face_x - vertical_width // 2, original_width - vertical_width))
        print(f"✓ Face detected. Using face-centered crop at x={x_start}")
        use_motion_tracking = False
    else:
        # No face detected - likely a screen recording
        # Scale so exactly half the width is visible, then track motion
        print(f"✗ No face detected. Using half-width with motion tracking for screen recording")
        use_motion_tracking = True
        x_start = 0  # Initial position, will be updated by tracking
    
    # Reset video to beginning
    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

    # For screen recordings, calculate scale factor for half-width display
    if use_motion_tracking:
        # Scale so original width fits into vertical_width
        target_display_width = original_width * 0.67
        scale = vertical_width / target_display_width
        scaled_width = int(original_width * scale)
        scaled_height = int(original_height * scale)
        
        # If scaled height exceeds vertical height, adjust scale
        if scaled_height > vertical_height:
            scale = vertical_height / original_height
            scaled_width = int(original_width * scale)
            scaled_height = int(original_height * scale)
        
        print(f"Scaling video from {original_width}x{original_height} to {scaled_width}x{scaled_height}")
        print(f"Half-width display: showing {scaled_width//2}px wide section from {scaled_width}px scaled frame")

    # Write output - use XVID for better Windows compatibility
    import platform
    if platform.system() == 'Windows':
        fourcc = cv2.VideoWriter_fourcc(*'XVID')
    else:
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_video_path, fourcc, fps, (vertical_width, vertical_height))
    global Fps
    Fps = fps

    frame_count = 0
    smoothed_x = 0  # Smoothed horizontal position in scaled coordinates
    prev_gray = None
    
    # Calculate update interval for motion tracking (max 1 shift per second)
    if use_motion_tracking:
        update_interval = int(fps)  # Update once per second
        print(f"Motion tracking: updating every {update_interval} frames (~1 shift/second)")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        if use_motion_tracking:
            # Resize frame first
            resized_frame = cv2.resize(frame, (scaled_width, scaled_height), interpolation=cv2.INTER_LANCZOS4)
            
            # Update motion tracking once per second
            if frame_count % update_interval == 0:
                curr_gray = cv2.cvtColor(resized_frame, cv2.COLOR_BGR2GRAY)
                
                if prev_gray is not None:
                    # Calculate optical flow
                    flow = cv2.calcOpticalFlowFarneback(prev_gray, curr_gray, None,
                                                         0.5, 3, 15, 3, 5, 1.2, 0)
                    magnitude = np.sqrt(flow[..., 0]**2 + flow[..., 1]**2)
                    
                    # Focus on significant motion
                    motion_threshold = 2.0
                    significant_motion = magnitude > motion_threshold
                    
                    if np.any(significant_motion):
                        # Weight columns by motion
                        col_motion = np.sum(magnitude * significant_motion, axis=0)
                        
                        if np.sum(col_motion) > 0:
                            motion_x = int(np.average(np.arange(scaled_width), weights=col_motion))
                            # Target x position to center motion in the crop
                            target_x = max(0, min(motion_x - vertical_width // 2, scaled_width - vertical_width))
                            
                            # Smooth tracking (90% previous, 10% new)
                            smoothed_x = int(0.90 * smoothed_x + 0.10 * target_x)
                
                prev_gray = curr_gray
            
            # Crop from scaled frame
            crop_x_start = int(smoothed_x)
            crop_x_end = min(crop_x_start + vertical_width, scaled_width)
            
            # Ensure we get full width
            if crop_x_end - crop_x_start < vertical_width:
                crop_x_start = max(0, crop_x_end - vertical_width)
            
            cropped_frame = resized_frame[:, crop_x_start:crop_x_end]
            
            # If scaled height is less than vertical height, add letterboxing
            if scaled_height < vertical_height:
                canvas = np.zeros((vertical_height, vertical_width, 3), dtype=np.uint8)
                offset_y = (vertical_height - scaled_height) // 2
                canvas[offset_y:offset_y+scaled_height, :] = cropped_frame
                cropped_frame = canvas
            elif scaled_height > vertical_height:
                # Crop height from top
                cropped_frame = cropped_frame[:vertical_height, :]
        else:
            # Face-detected videos: static crop
            cropped_frame = frame[:, x_start:x_start+vertical_width]
        
        if cropped_frame.shape[1] == 0:
            print(f"Warning: Empty crop at frame {frame_count}")
            break

        # Ensure frame matches expected dimensions before writing
        if cropped_frame.shape[0] != vertical_height or cropped_frame.shape[1] != vertical_width:
            cropped_frame = cv2.resize(cropped_frame, (vertical_width, vertical_height), interpolation=cv2.INTER_LANCZOS4)

        out.write(cropped_frame)
        frame_count += 1
        
        if frame_count % 100 == 0:
            print(f"Processed {frame_count}/{total_frames} frames")

    cap.release()
    out.release()
    print(f"Cropping complete. Processed {frame_count} frames -> {output_video_path}")



def combine_videos(video_with_audio, video_without_audio, output_filename):
    try:
        # Load video clips
        clip_with_audio = VideoFileClip(video_with_audio)
        clip_without_audio = VideoFileClip(video_without_audio)

        audio = clip_with_audio.audio

        combined_clip = clip_without_audio.set_audio(audio)

        global Fps
        combined_clip.write_videofile(output_filename, codec='libx264', audio_codec='aac', fps=Fps, preset='medium', bitrate='3000k')
        print(f"Combined video saved successfully as {output_filename}")
    
    except Exception as e:
        print(f"Error combining video and audio: {str(e)}")



if __name__ == "__main__":
    input_video_path = r'Out.mp4'
    output_video_path = 'Croped_output_video.mp4'
    final_video_path = 'final_video_with_audio.mp4'
    detect_faces_and_speakers(input_video_path, "DecOut.mp4")
    crop_to_vertical(input_video_path, output_video_path)
    combine_videos(input_video_path, output_video_path, final_video_path)



