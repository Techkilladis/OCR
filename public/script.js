const imageInput = document.getElementById("imageInput");
const previewImg = document.getElementById("previewImg");
const output = document.getElementById("output");

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (file) {
    previewImg.src = URL.createObjectURL(file);
  }
});

// NEW: Grayscale Preprocessing Logic
async function processToGrayscale(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = data[i + 1] = data[i + 2] = avg;
        }
        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob((blob) => {
          resolve(new File([blob], "preprocessed.jpg", { type: "image/jpeg" }));
        }, "image/jpeg");
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function uploadImage() {
  const originalFile = imageInput.files[0];
  if (!originalFile) {
    alert("Please select an image");
    return;
  }

  output.textContent = "Processing OCR...";

  try {
    // Convert to grayscale BEFORE sending to API
    const grayscaleFile = await processToGrayscale(originalFile);

    const formData = new FormData();
    formData.append("image", grayscaleFile);

    const res = await fetch("/ocr", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    output.textContent = data.success ? data.text : "Error extracting text";
  } catch (err) {
    console.error(err);
    output.textContent = "Error during processing";
  }
}