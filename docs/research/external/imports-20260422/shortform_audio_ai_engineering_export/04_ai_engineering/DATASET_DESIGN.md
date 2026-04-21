# **Dataset Design**

## **Tables**

### **videos**

```sql
CREATE TABLE videos (
  video_id TEXT PRIMARY KEY,
  platform TEXT,
  creator_id TEXT,
  post_time TIMESTAMP,
  duration_sec REAL,
  topic TEXT,
  format_type TEXT,
  objective TEXT,
  caption TEXT,
  hashtags TEXT,
  audio_asset_id TEXT,
  visual_asset_id TEXT
);
```

### **audio_features**

```sql
CREATE TABLE audio_features (
  audio_asset_id TEXT PRIMARY KEY,
  duration_sec REAL,
  first_sound_ms INT,
  first_voice_ms INT,
  first_transient_ms INT,
  mean_rms REAL,
  rms_first_500ms REAL,
  dynamic_range REAL,
  silence_ratio REAL,
  tempo_bpm REAL,
  onset_density REAL,
  spectral_centroid_mean REAL,
  mfcc_mean JSON,
  speech_rate_wpm REAL,
  pitch_mean_hz REAL,
  pitch_std_hz REAL,
  pause_ratio REAL,
  voice_music_separation REAL,
  arousal REAL,
  valence REAL,
  loop_score REAL,
  template_score REAL,
  brand_fit REAL,
  risk_score REAL,
  rights_source TEXT
);
```

### **audio_events**

```sql
CREATE TABLE audio_events (
  event_id TEXT PRIMARY KEY,
  video_id TEXT,
  start_ms INT,
  end_ms INT,
  event_type TEXT,
  event_strength REAL,
  aligned_visual_event BOOLEAN,
  aligned_caption_event BOOLEAN
);
```

### **metrics**

```sql
CREATE TABLE metrics (
  video_id TEXT PRIMARY KEY,
  collected_at TIMESTAMP,
  hours_since_post REAL,
  views INT,
  followers_at_post INT,
  one_sec_retention REAL,
  three_sec_retention REAL,
  six_sec_retention REAL,
  completion_rate REAL,
  avg_watch_pct REAL,
  replay_rate REAL,
  likes INT,
  comments INT,
  shares INT,
  saves INT,
  follows INT,
  sound_reuses INT
);
```

## **Feature store principle**

Store both:

```text
interpretable features → debugging and decision rules
embedding features → retrieval and nonlinear prediction
```
