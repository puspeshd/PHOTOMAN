import json
import traceback
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from fastapi.middleware.cors import CORSMiddleware
import hashlib
import os
from datetime import datetime
import shutil
from fastapi.responses import FileResponse
from moviepy import ImageClip,  CompositeVideoClip, concatenate_videoclips, vfx
import random
import io

# Initialize FastAPI app
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
engine = create_engine("sqlite:///./users.db")
Base = declarative_base()
SessionLocal = sessionmaker(bind=engine)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    email = Column(String, unique=True)
    phone = Column(String)

Base.metadata.create_all(bind=engine)

# Input schema
class UserInfo(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: str

# Schemas
class UserLogin(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: str
    password: str

class VideoUrls(BaseModel):
    urls: list
class ApproverCheckRequest(BaseModel):
    email: str
    
# Register new user
@app.post("/login_or_register")
def login_or_register(user: UserInfo):
    db = SessionLocal()
    existing_user = db.query(User).filter(User.email == user.email).first()

    if existing_user:
        return {
            "success": True,
            "message": "User logged in successfully",
            "user": {
                "id": existing_user.id,
                "first_name": existing_user.first_name,
                "last_name": existing_user.last_name,
                "email": existing_user.email,
                "phone": existing_user.phone,
            },
        }

    # Register new user
    db_user = User(
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        phone=user.phone,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {
        "success": True,
        "message": "New user registered and logged in",
        "user": {
            "id": db_user.id,
            "first_name": db_user.first_name,
            "last_name": db_user.last_name,
            "email": db_user.email,
            "phone": db_user.phone,
        },
    }
@app.post("/users")
def create_user(user: UserCreate):
    db = SessionLocal()
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = hashlib.sha256(user.password.encode()).hexdigest()
    db_user = User(
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        phone=user.phone,
        password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"success": True, "user_id": db_user.id}


@app.get("/videos")
def list_videos(user_id: str):
    videos = get_urls_for_user(user_id)
    return {"video_urls": videos}

@app.post("/login")
def login(user: UserLogin):
    db = SessionLocal()
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    hashed_password = hashlib.sha256(user.password.encode()).hexdigest()
    if db_user.password != hashed_password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    
    
    return {"success": True, "user": {"id": db_user.id, "first_name": db_user.first_name}}


# ------------------------------------------------------------
# 🖼️ Image upload route
# ------------------------------------------------------------

def get_urls_for_user(user_id):
    try:
        video_dir_user =os.listdir(f'approved_videos/{user_id}/')
        
        return video_dir_user
    except:
        traceback.print_exc()
        return []
@app.post("/upload")
async def upload_photos(user_id: int = Form(...), photos: list[UploadFile] = File(...)):
    """
    Accept multiple photos, save them, apply flying transitions, and return video URL.
    """
    upload_dir = os.path.join("uploads", str(user_id))
    os.makedirs(upload_dir, exist_ok=True)

    saved_files = []
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    os.makedirs(os.path.join(upload_dir,timestamp), exist_ok=True)
    for photo in photos:
        
        file_ext = ".jpg"
        file_path = os.path.join(upload_dir,timestamp, f"{photos.index(photo)}{file_ext}")
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)
        saved_files.append(file_path)

    # Process images (resize, etc.)
    from PIL import Image
    from rembg import remove
    processed_files = []
    target_size = None
    if saved_files:
        with Image.open(saved_files[0]) as img:
            target_size = img.size
    for img_path in saved_files:
        processed_path = img_path.replace("uploads", "processed_uploads")
        os.makedirs(os.path.dirname(processed_path), exist_ok=True)
        
        try:
            with Image.open(img_path) as img:
                # Resize
                if target_size:
                    img = img.resize(target_size)

                # --- Background removal ---
                try:
                    # Convert to bytes
                    img_byte_arr = io.BytesIO()
                    img.save(img_byte_arr, format="PNG")
                    img_byte_arr = img_byte_arr.getvalue()

                    # Remove background
                    output = remove(img_byte_arr)

                    # Load result into PIL
                    img = Image.open(io.BytesIO(output)).convert("RGBA")

                    # Create a black background image
                    black_bg = Image.new("RGBA", img.size, (0, 0, 0, 255))

                    # Composite the transparent image onto the black background
                    img = Image.alpha_composite(black_bg, img)

                    # (Optional) Convert back to RGB if you don’t need alpha
                    img = img.convert("RGB")

                except Exception as bg_err:
                    print(f"Background removal error for {img_path}: {bg_err}")

                # --- Handle RGBA to RGB for JPG ---
                if processed_path.lower().endswith((".jpg", ".jpeg")) and img.mode == "RGBA":
                    bg = Image.new("RGB", img.size, (255, 255, 255))
                    bg.paste(img, mask=img.split()[3])  # paste using alpha channel
                    img = bg

                # Save final image
                img.save(processed_path)
                processed_files.append(processed_path)
        except Exception as e:
            print(f"Error processing {img_path}: {e}")
    # Create flying effect transitions for each image
    """clips = []
    directions = ["left", "right", "top", "bottom"]
    duration = 5  # seconds per image

    W, H = target_size if target_size else (1280, 720)
    for idx, img_path in enumerate(processed_files):
        direction = random.choice(directions)
        clip = ImageClip(img_path).with_duration(duration).resized((W, H))

        def make_pos(t):
            # Animate from off-screen to center
            if direction == "left":
                x = int(-W + (W * t / duration))
                y = 0
            elif direction == "right":
                x = int(W - (W * t / duration))
                y = 0
            elif direction == "top":
                x = 0
                y = int(-H + (H * t / duration))
            else:  # bottom
                x = 0
                y = int(H - (H * t / duration))
            return (x, y)

        animated = clip.with_position(make_pos)
        clips.append(animated)

    final_clip = concatenate_videoclips(clips, method="compose")

    output_dir = os.path.join("output", str(user_id))
    os.makedirs(output_dir, exist_ok=True)
    video_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    video_filename = f"{video_timestamp}.mp4"
    video_path = os.path.join(output_dir, video_filename)"""

    """try:
        final_clip.write_videofile(video_path, codec="libx264", fps=24)
    except Exception as e:
        return {"success": False, "error": str(e)}"""

    # Serve video via /download route

    video_urls = get_urls_for_user(user_id)
    print(video_urls)


    

        # Remove background from processed images
    
    
    # try:
    #     # Remove uploaded and processed files for this user
    #     for f in saved_files:
    #         if os.path.exists(f):
    #             os.remove(f)
    #     for f in processed_files:
    #         if os.path.exists(f):
    #             os.remove(f)
    # except Exception as cleanup_err:
    #     # Log cleanup error if needed
    #     # Log cleanup error if needed
    #     print(f"Cleanup error: {cleanup_err}")
    return {
        "success": True,
        "count": len(saved_files),
        "saved_files": saved_files,
        "video_url": video_urls
    }
@app.get("/download/{user_id}/{video_filename}")
def download_video(user_id: int, video_filename: str):
    video_path = os.path.join("approved_videos", str(user_id), video_filename)
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(video_path, media_type="video/mp4", filename=video_filename)
from fastapi import Query
from typing import List

# ------------------------------------------------------------
# 🧑‍💼 Approver Dashboard APIs
# ------------------------------------------------------------

@app.get("/get_users")
def get_users():
    """Return list of all users for approver dashboard."""
    db = SessionLocal()
    users = db.query(User).all()
    return {"users": [{"id": u.id, "name": f"{u.first_name} {u.last_name}"} for u in users]}


@app.get("/get_folders")
def get_folders(user_id: int = Query(...)):
    """Return list of available folders for a user."""
    user_upload_dir = os.path.join("processed_uploads", str(user_id))
    approved_dir = os.path.join("approved_uploads", str(user_id))
    folders = []

    for base_dir in [user_upload_dir]:
        if os.path.exists(base_dir):
            for folder_name in os.listdir(base_dir):
                full_path = os.path.join(base_dir, folder_name)
                if os.path.isdir(full_path):
                    folders.append(folder_name)

    return {"folders": sorted(set(folders))}


@app.get("/get_photos")
def get_photos(user_id: int, folder: str):
    """Return list of photo URLs for a specific user folder."""
    folder_path = os.path.join("processed_uploads", str(user_id), folder)
    if not os.path.exists(folder_path):
        raise HTTPException(status_code=404, detail="Folder not found")

    photos = []
    for filename in os.listdir(folder_path):
        if filename.lower().endswith((".jpg", ".jpeg", ".png")):
            photos.append(f"http://150.230.132.224:8000/get_photo/{user_id}/{folder}/{filename}")
    return {"photos": photos}


@app.get("/get_photo/{user_id}/{folder}/{filename}")
def get_photo(user_id: int, folder: str, filename: str):
    """Serve individual photo files."""
    file_path = os.path.join("processed_uploads", str(user_id), folder, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

@app.post("/approvercheck")
def approver_check(user: ApproverCheckRequest):
    with open('approver.json',"r") as jsonf:
        users = json.load(jsonf)
    if user.email in users['approver_email']:
        return {"is_approver": True}
    else:
        return {"is_approver": False}

@app.post("/approve_photos")
async def approve_photos(
    user_id: int = Form(...),
    folder: str = Form(...),
    photos: List[UploadFile] = File(...)
):
    """Accept approved (possibly edited) photos from approver."""
    approved_dir = os.path.join("approved_uploads", str(user_id), folder)
    os.makedirs(approved_dir, exist_ok=True)

    saved_files = []
    for photo in photos:
        file_path = os.path.join(approved_dir, photo.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)
        saved_files.append(file_path)


    
    base_dir = os.path.join("approved_uploads", str(user_id))
    if not os.path.exists(base_dir):
        raise HTTPException(status_code=404, detail="No approved uploads found.")

    # Collect approved images
    image_files = []
    for file in os.listdir(approved_dir):
            if file.lower().endswith((".jpg" )):
                image_files.append(os.path.join(approved_dir, file))
    if not image_files:
        raise HTTPException(status_code=404, detail="No approved images available.")

    # Sort by modified time
    image_files.sort(key=lambda f: os.path.getmtime(f))

    # Settings
    duration = 5
    W, H = (1280, 720)
    directions = ["BL_TR", "BR_TL", "TR_BL", "TL_BR"]  # move directions
    clips = []

    for idx, img_path in enumerate(image_files):
        clip = ImageClip(img_path).resized((W * 1.2, H * 1.2))  # zoomed a bit for smooth pan

        # Choose direction
        direction = directions[idx % 4]

        if direction == "BL_TR":  # bottom-left → top-right
            start_pos = (-W * 0.1, H * 0.1)
            end_pos = (W * 0.1, -H * 0.1)
        elif direction == "BR_TL":  # bottom-right → top-left
            start_pos = (W * 0.1, H * 0.1)
            end_pos = (-W * 0.1, -H * 0.1)
        elif direction == "TR_BL":  # top-right → bottom-left
            start_pos = (W * 0.1, -H * 0.1)
            end_pos = (-W * 0.1, H * 0.1)
        else:  # TL_BR: top-left → bottom-right
            start_pos = (-W * 0.1, -H * 0.1)
            end_pos = (W * 0.1, H * 0.1)

        moving_clip = clip.with_duration(duration).with_position(
            lambda t, start=start_pos, end=end_pos: (
                start[0] + (end[0] - start[0]) * (t / duration),
                start[1] + (end[1] - start[1]) * (t / duration)
            )
        )

        # Composite over background
        composite = CompositeVideoClip([moving_clip], size=(W, H)).with_duration(duration)
        clips.append(composite)

    # Concatenate
    final_clip = concatenate_videoclips(clips, method="compose")

    # Output
    output_dir = os.path.join("approved_videos", str(user_id))
    os.makedirs(output_dir, exist_ok=True)
    db = SessionLocal()
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    #video_name = datetime.now().strftime("%Y%m%d_%H%M%S") + "_approved.mp4"
    fname = user.first_name.strip().replace(" ", "_")
    lname = user.last_name.strip().replace(" ", "_")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    video_name = f"{fname}_{lname}_{timestamp}.mp4"
    video_path = os.path.join(output_dir, video_name)
    try:
        try:
            shutil.rmtree(approved_dir)
        except:
            pass
        try:
            shutil.rmtree(approved_dir.replace('approved_uploads','processed_uploads'))
        except:
            pass
        try:
            shutil.rmtree(approved_dir.replace('approved_uploads','uploads'))
        except:
            pass
    except:
        pass
    final_clip.write_videofile(video_path, codec="libx264", fps=24)

    
    # import json
    # try:
    #     with open(f"{user_id}.json","r") as json_f:
    #         jf = json.load(json_f)
    # except FileNotFoundError:
    #         jf = []
    # jf.append(f"http://150.230.132.224:8000/download/{user_id}/{video_name}")
    # with open(f"{user_id}.json","w") as json_f:
    #     json.dump(jf,json_f)
    video_dir_user =os.listdir(f'approved_videos/{user_id}/')


    return {
        "success": True,
        "video_url": video_dir_user
    }
    


# ------------------------------------------------------------
# 🎞️ Generate video from APPROVED images
# ------------------------------------------------------------



    

