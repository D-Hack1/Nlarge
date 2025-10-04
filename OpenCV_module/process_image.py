import cv2
import os

# Folder setup
RAW_FOLDER = "data/raw_images"   # folder with original images
PROCESSED_FOLDER = "processed"   # folder to save processed images
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

def resize_image(image, max_size=1024):
    """
    Resizes the image so that the largest dimension is max_size.
    Keeps aspect ratio intact.
    """
    height, width = image.shape[:2]

    # Check if resizing is needed
    if max(height, width) <= max_size:
        return image  # no resizing needed

    # Calculate scaling factor
    scale = max_size / max(height, width)
    new_width = int(width * scale)
    new_height = int(height * scale)

    # Resize image
    resized_image = cv2.resize(image, (new_width, new_height))
    return resized_image


# Single image processing function
def process_single_image(image, max_size=1024):
    """
    Processes a single image:
    - Converts to grayscale
    - Detects edges
    - Finds contours
    Returns edges (numpy array) and contour data (list of bounding boxes)
    """
    image = resize_image(image, max_size)

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Collect contour data with additional features
    contour_data = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        area = cv2.contourArea(c)
        perimeter = cv2.arcLength(c, True)
        contour_data.append({
            "bbox": (x, y, w, h),
            "area": area,
            "perimeter": perimeter
        })

    return edges, contour_data

# Process all images in folder
def process_all_images(save_output=False, max_size=1024):
    """
    Loops through all images in RAW_FOLDER, processes them.
    Supports multiple formats (.jpg, .png, .webp, etc.)
    Returns a dictionary: {image_name: (edges_array, contour_data)}
    """
    # Filter common image formats
    valid_extensions = (".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff")
    images = [f for f in os.listdir(RAW_FOLDER) if f.lower().endswith(valid_extensions)]
    results = {}

    for img_name in images:
        img_path = os.path.join(RAW_FOLDER, img_name)
        image = cv2.imread(img_path, cv2.IMREAD_COLOR)

        if image is None:
            print(f"Failed to read {img_name}, skipping...")
            continue

        # Resize for processing
        height, width = image.shape[:2]
        scale = 1.0
        resized_image = image.copy()
        max_dim = max(height, width)
        if max_dim > max_size:
            scale = max_dim / max_size
            resized_width = int(width / scale)
            resized_height = int(height / scale)
            resized_image = cv2.resize(image, (resized_width, resized_height))

        # Process the resized image
        edges, contour_data = process_single_image(resized_image, max_size)

        results[img_name] = (edges, contour_data)

        if save_output:
            # Save edges
            cv2.imwrite(os.path.join(PROCESSED_FOLDER, "edges_" + img_name), edges)

            # Draw contours on original image using scaled coordinates
            contour_img = image.copy()
            for c in contour_data:
                x, y, w, h = c["bbox"]
                # Scale coordinates back to original image size
                x = int(x * scale)
                y = int(y * scale)
                w = int(w * scale)
                h = int(h * scale)
                cv2.rectangle(contour_img, (x, y), (x + w, y + h), (0, 255, 0), 2)

            cv2.imwrite(os.path.join(PROCESSED_FOLDER, "contours_" + img_name), contour_img)

        print(f"Processed {img_name}")

    return results


# Main execution
if __name__ == "__main__":
    all_results = process_all_images(save_output=True)
    if all_results:
        first_image_name = list(all_results.keys())[0]
        edges, contour_data = all_results[first_image_name]
        print(f"{first_image_name} has {len(contour_data)} contours detected")
    print("✅ All images processed.")
