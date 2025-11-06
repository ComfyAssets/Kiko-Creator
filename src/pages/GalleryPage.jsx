import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useGalleryStore } from "../stores/galleryStore";
import { useGenerationStore } from "../stores/generationStore";
import ImageLightbox from "../components/ImageLightbox";

export default function GalleryPage() {
  const { images, removeImage, removeImages, toggleFavorite, isFavorite } =
    useGalleryStore();
  const { setPendingImageMetadata } = useGenerationStore();
  const navigate = useNavigate();

  const [gridColumns, setGridColumns] = useState(3);
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(true); // DEBUG: Always visible

  const galleryContainerRef = useRef(null);

  const displayImages = showFavoritesOnly
    ? images.filter((img) => isFavorite(img.id))
    : images;

  // Handle scroll event to show/hide scroll-to-top button
  useEffect(() => {
    const container = galleryContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Show button if scrolled more than 100px
      setShowScrollTop(container.scrollTop > 100);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll to top function
  const scrollToTop = () => {
    // Scroll window to top for full page
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Also ensure inner gallery is at top (in case of internal scrolling)
    const container = galleryContainerRef.current;
    if (container) {
      container.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col"
    >
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary flex items-center gap-2">
            <span>🖼️</span>
            Image Gallery
            {images.length > 0 && (
              <span className="text-sm md:text-base text-text-tertiary font-normal">
                ({images.length} {images.length === 1 ? "image" : "images"})
              </span>
            )}
          </h1>

          <div className="flex items-center gap-2">
            {/* Selection Mode Toggle */}
            {images.length > 0 && (
              <button
                onClick={() => {
                  setSelectionMode(!selectionMode);
                  setSelectedImages([]);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                  selectionMode
                    ? "bg-accent-primary text-white"
                    : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                }`}
              >
                {selectionMode ? "✓ Selection Mode" : "Select"}
              </button>
            )}

            {/* Favorites Filter */}
            {images.length > 0 && (
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                  showFavoritesOnly
                    ? "bg-yellow-500/20 text-yellow-500"
                    : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                }`}
              >
                ⭐ Favorites
              </button>
            )}
          </div>
        </div>

        {/* Grid Size Control */}
        {images.length > 0 && (
          <div className="flex items-center gap-3 mb-3">
            <label className="text-xs md:text-sm text-text-secondary">
              Grid: {gridColumns} columns
            </label>
            <input
              type="range"
              min="2"
              max="6"
              value={gridColumns}
              onChange={(e) => setGridColumns(parseInt(e.target.value))}
              className="flex-1 max-w-xs"
            />
          </div>
        )}

        {/* Batch Actions */}
        {selectionMode && selectedImages.length > 0 && (
          <div className="flex items-center gap-2 p-2 bg-bg-tertiary rounded-lg border border-border-primary">
            <span className="text-xs md:text-sm text-text-secondary">
              {selectedImages.length} selected
            </span>
            <button
              onClick={() => {
                selectedImages.forEach((id) => {
                  const image = images.find((img) => img.id === id);
                  if (image) {
                    const a = document.createElement("a");
                    a.href = image.url;
                    a.download = image.filename;
                    a.click();
                  }
                });
              }}
              className="px-2 py-1 bg-accent-primary/10 text-accent-primary rounded text-xs hover:bg-accent-primary/20"
            >
              ⬇ Download
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete ${selectedImages.length} images?`)) {
                  removeImages(selectedImages);
                  setSelectedImages([]);
                  setSelectionMode(false);
                }
              }}
              className="px-2 py-1 bg-accent-error/10 text-accent-error rounded text-xs hover:bg-accent-error/20"
            >
              🗑️ Delete
            </button>
            <button
              onClick={() => setSelectedImages([])}
              className="ml-auto px-2 py-1 text-text-tertiary rounded text-xs hover:bg-bg-hover"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Gallery Grid */}
      <div
        ref={galleryContainerRef}
        className="flex-1 bg-bg-secondary rounded-lg border border-border-primary overflow-auto"
      >
        {displayImages.length > 0 ? (
          <div
            className="grid gap-3 p-3"
            style={{
              gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
            }}
          >
            {displayImages.map((image, index) => (
              <GalleryImage
                key={image.id}
                image={image}
                index={index}
                selectionMode={selectionMode}
                isSelected={selectedImages.includes(image.id)}
                isFavorite={isFavorite(image.id)}
                onSelect={(id) => {
                  if (selectedImages.includes(id)) {
                    setSelectedImages(selectedImages.filter((i) => i !== id));
                  } else {
                    setSelectedImages([...selectedImages, id]);
                  }
                }}
                onView={() => {
                  setLightboxImage(image);
                  setLightboxIndex(images.indexOf(image));
                }}
                onToggleFavorite={() => toggleFavorite(image.id)}
                onDelete={() => {
                  if (confirm("Delete this image?")) {
                    removeImage(image.id);
                  }
                }}
                onDownload={() => {
                  const a = document.createElement("a");
                  a.href = image.url;
                  a.download = image.filename;
                  a.click();
                }}
                onGenerate={() => {
                  if (image.metadata) {
                    setPendingImageMetadata(image.metadata);
                    navigate("/generate");
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center p-8">
            <div>
              <div className="text-6xl mb-4">
                {showFavoritesOnly ? "⭐" : "🖼️"}
              </div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                {showFavoritesOnly ? "No Favorites Yet" : "No Images Yet"}
              </h2>
              <p className="text-text-secondary mb-4">
                {showFavoritesOnly
                  ? "Star some images to see them here"
                  : "Generate some images to get started"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          image={lightboxImage}
          currentIndex={lightboxIndex}
          totalImages={images.length}
          onClose={() => setLightboxImage(null)}
          onNext={() => {
            const nextIndex = (lightboxIndex + 1) % images.length;
            setLightboxIndex(nextIndex);
            setLightboxImage(images[nextIndex]);
          }}
          onPrevious={() => {
            const prevIndex =
              (lightboxIndex - 1 + images.length) % images.length;
            setLightboxIndex(prevIndex);
            setLightboxImage(images[prevIndex]);
          }}
        />
      )}

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-40 w-12 h-12 flex items-center justify-center rounded-full bg-accent-primary text-white shadow-lg hover:bg-accent-primary/90 hover:scale-110 transition-transform"
            title="Scroll to top"
          >
            <span className="text-2xl">↑</span>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Gallery Image Component
function GalleryImage({
  image,
  index,
  selectionMode,
  isSelected,
  isFavorite,
  onSelect,
  onView,
  onToggleFavorite,
  onDelete,
  onDownload,
  onGenerate,
}) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative group rounded-lg overflow-hidden border border-border-primary bg-bg-primary aspect-square"
    >
      {/* Selection Checkbox */}
      {selectionMode && (
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(image.id)}
            className="w-5 h-5 rounded border-border-primary bg-bg-secondary text-accent-primary focus:ring-2 focus:ring-accent-primary/20 cursor-pointer"
          />
        </div>
      )}

      {/* Favorite Star */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className={`absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full backdrop-blur-sm transition-all ${
          isFavorite
            ? "bg-yellow-500/90 text-white scale-110"
            : "bg-black/30 text-white/60 hover:bg-black/50 hover:text-white"
        }`}
      >
        ⭐
      </button>

      {/* Image */}
      <div
        onClick={selectionMode ? () => onSelect(image.id) : onView}
        className="w-full h-full cursor-pointer"
      >
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <img
          src={image.url}
          alt={image.filename}
          className={`w-full h-full object-cover transition-opacity ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setImageLoaded(true)}
          onError={(e) => {
            console.error("Failed to load image:", image.url);
            e.target.src =
              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23222" width="400" height="400"/%3E%3Ctext fill="%23666" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EFailed to load%3C/text%3E%3C/svg%3E';
          }}
        />
      </div>

      {/* Action Buttons (appear on hover) */}
      {!selectionMode && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center justify-center gap-2">
            {image.metadata && onGenerate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerate();
                }}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded text-white text-xs backdrop-blur-sm"
                title="Generate Again"
              >
                ✨
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              className="p-1.5 bg-white/10 hover:bg-white/20 rounded text-white text-xs backdrop-blur-sm"
              title="Download"
            >
              ⬇️
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(image.url);
              }}
              className="p-1.5 bg-white/10 hover:bg-white/20 rounded text-white text-xs backdrop-blur-sm"
              title="Copy URL"
            >
              📋
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 bg-white/10 hover:bg-white/20 rounded text-white text-xs backdrop-blur-sm"
              title="Delete"
            >
              🗑️
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
