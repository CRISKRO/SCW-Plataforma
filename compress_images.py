import os
from PIL import Image

def compress_image(path, target_ext=".webp", quality=80, max_width=1920):
    if not os.path.exists(path):
        print(f"Skipping {path}, not found.")
        return

    size_before = os.path.getsize(path)
    
    with Image.open(path) as img:
        img = img.convert("RGB") if img.mode in ("RGBA", "P") else img
        
        # Resize if width > max_width
        if img.width > max_width:
            ratio = max_width / img.width
            new_size = (max_width, int(img.height * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
            
        new_path = os.path.splitext(path)[0] + target_ext
        img.save(new_path, format="WEBP", quality=quality)
        
    size_after = os.path.getsize(new_path)
    print(f"Compressed {path} -> {new_path}: {size_before/1024:.0f}KB -> {size_after/1024:.0f}KB")
    
    # Remove original if different extension
    if os.path.abspath(path) != os.path.abspath(new_path):
        os.remove(path)

images_to_compress = [
    "frontend/public/images/scwpremium.jpg",
    "frontend/public/images/logoring.png",
    "frontend/public/images/logoring2.png",
]

for img_path in images_to_compress:
    compress_image(img_path)

# For the logo, keep PNG transparency but compress it
def compress_png(path):
    if not os.path.exists(path):
        return
    size_before = os.path.getsize(path)
    with Image.open(path) as img:
        if img.width > 500:
            ratio = 500 / img.width
            new_size = (500, int(img.height * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
        img.save(path, optimize=True)
    size_after = os.path.getsize(path)
    print(f"Compressed logo {path}: {size_before/1024:.0f}KB -> {size_after/1024:.0f}KB")

compress_png("frontend/public/images/logo-scw.png")
