# Recording the typeshift Terminal Demo on Windows

This guide provides simple, beginner-friendly instructions to record a genuine, high-definition terminal demonstration of **typeshift v0.2.0** using built-in Windows tools or FFmpeg.

---

## 1. Terminal Window Setup (Recommended)

For the cleanest visual appearance in community posts and READMEs:
- **Application**: Windows Terminal (or PowerShell 7)
- **Profile / Theme**: One Half Dark, Campbell, or Dracula
- **Font**: Cascadia Code or JetBrains Mono, size **14pt** or **16pt**
- **Window Size**: Approximately **1000 × 650 pixels** (or ~95 columns × 28 rows)
- **Working Directory**: `D:\OSS\typeshift` (repository root)

---

## 2. Option A: Windows Snipping Tool (Recommended — Built-in & Crisp)

Windows 11 includes a native, high-frame-rate screen recorder with zero software installation required.

1. Open your terminal window in `D:\OSS\typeshift`.
2. Press **`Win + Shift + R`** (or open the **Snipping Tool** app and click the **Video / Camera** icon).
3. Click **New** and drag a rectangle tightly around the terminal window (excluding unnecessary desktop clutter).
4. Click **Start** (a 3-second countdown will appear).
5. In your terminal, run either:
   ```powershell
   node launch-assets/demo/run-demo.js
   ```
   or:
   ```powershell
   .\launch-assets\demo\run-demo.ps1
   ```
6. The script will automatically type out the commands, execute them against the published `@mohsami/typeshift@0.2.0` package, show real diagnostic outputs and exit code 2, and display the ending banner (~45 seconds total).
7. When the demo completes, click the red **Stop** button in the floating Snipping Tool bar.
8. Click **Save As** (floppy disk icon) and save to:
   `launch-assets/media/typeshift-demo.mp4`

---

## 3. Option B: Xbox Game Bar (`Win + Alt + R`)

If you want a one-keystroke recorder that captures just the active application window:

1. Click inside your terminal window to focus it.
2. Press **`Win + Alt + R`** to start recording immediately.
3. Run `node launch-assets/demo/run-demo.js`.
4. When finished, press **`Win + Alt + R`** again to stop.
5. The video is automatically saved to your `Videos\Captures` folder. Copy the `.mp4` file to `launch-assets/media/typeshift-demo.mp4`.

---

## 4. Option C: Direct FFmpeg Window/Screen Capture

FFmpeg is already installed on your system (`ffmpeg.exe`). If you prefer to capture your primary screen directly from PowerShell:

```powershell
# Records 50 seconds of desktop capture at 30 fps
ffmpeg -f gdigrab -framerate 30 -offset_x 100 -offset_y 100 -video_size 1280x720 -i desktop -c:v libx264 -pix_fmt yuv420p -t 50 launch-assets/media/typeshift-demo.mp4
```

---

## 5. Converting to Optimized GIF (Optional for GitHub / Dev.to)

If you need a lightweight animated GIF to embed in a blog post or GitHub issue:

```powershell
ffmpeg -i launch-assets/media/typeshift-demo.mp4 -vf "fps=15,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 launch-assets/media/typeshift-demo.gif
```

---

## 6. Where Media Files Are Stored

- Directory: `launch-assets/media/`
- Standard filename: `typeshift-demo.mp4`
- Note: Large binary video files (`*.mp4`, `*.webm`) are kept in `launch-assets/media/` and ignored by Git so repository clone size remains lightweight.
