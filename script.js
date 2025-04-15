// Unsplash API Configuration
const UNSPLASH_API_KEY = "K8TbeAtRDthMMQOkSDgu8ue0wHGXUYL5B3I06w-zZ3M" 
const UNSPLASH_API_URL = "https://api.unsplash.com"
const IMAGES_PER_PAGE = 30

// DOM Elements
const imageGrid = document.getElementById("imageGrid")
const loadMoreBtn = document.getElementById("loadMoreBtn")
const loadingSpinner = document.getElementById("loadingSpinner")
const searchInput = document.getElementById("searchInput")
const searchButton = document.getElementById("searchButton")
const filterButtons = document.querySelectorAll(".filter-btn")
const lightbox = document.getElementById("lightbox")
const lightboxImage = document.getElementById("lightboxImage")
const lightboxClose = document.getElementById("lightboxClose")
const lightboxPrev = document.getElementById("lightboxPrev")
const lightboxNext = document.getElementById("lightboxNext")
const lightboxTitle = document.getElementById("lightboxTitle")
const lightboxAuthor = document.getElementById("lightboxAuthor")
const downloadLink = document.getElementById("downloadLink")
const categoriesSection = document.querySelector(".categories")

// State Variables
let currentPage = 1
let currentQuery = ""
let currentCategory = "all"
let totalPages = 0
let currentImages = []
let currentLightboxIndex = 0
let activeSearchTags = []
let likedImages = new Set()

// Initialize the gallery
document.addEventListener("DOMContentLoaded", () => {
    // Load initial images
    loadImages()
    
    // Set up event listeners
    setupEventListeners()
    
    // Load liked images from localStorage
    loadLikedImagesFromStorage()
})

// Load liked images from localStorage
function loadLikedImagesFromStorage() {
    const storedLikedImages = localStorage.getItem('likedImages')
    if (storedLikedImages) {
        const likedImagesArray = JSON.parse(storedLikedImages)
        likedImages = new Set(likedImagesArray)
        updateLikeButtonsUI()
    }
}

// Save liked images to localStorage
function saveLikedImagesToStorage() {
    localStorage.setItem('likedImages', JSON.stringify([...likedImages]))
}

// Set up event listeners
function setupEventListeners() {
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener("click", () => {
            currentPage++
            loadImages(false)
        })
    }
    
    if (searchButton && searchInput) {
        searchButton.addEventListener("click", handleSearch)
        searchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                handleSearch()
            }
        })
    }
    
    filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const filter = button.getAttribute("data-filter")
            setActiveFilter(button)
            filterImages(filter)
        })
    })
    
    if (lightbox) {
        lightboxClose.addEventListener("click", closeLightbox)
        lightboxPrev.addEventListener("click", showPrevImage)
        lightboxNext.addEventListener("click", showNextImage)
        lightbox.addEventListener("click", (e) => {
            if (e.target === lightbox) {
                closeLightbox()
            }
        })
    }
    
    document.addEventListener("keydown", (e) => {
        if (!lightbox || !lightbox.classList.contains("active")) return
        if (e.key === "Escape") {
            closeLightbox()
        } else if (e.key === "ArrowLeft") {
            showPrevImage()
        } else if (e.key === "ArrowRight") {
            showNextImage()
        }
    })
    
    window.addEventListener("resize", resizeMasonryItems)
}

// Load images from Unsplash API
async function loadImages(resetGrid = true) {
    if (!imageGrid) return
    showLoading(true)
    if (resetGrid) {
        imageGrid.innerHTML = ""
        currentPage = 1
    }
    try {
        let url
        if (currentQuery) {
            url = `${UNSPLASH_API_URL}/search/photos?query=${currentQuery}&page=${currentPage}&per_page=${IMAGES_PER_PAGE}&client_id=${UNSPLASH_API_KEY}`
        } else {
            url = `${UNSPLASH_API_URL}/photos?page=${currentPage}&per_page=${IMAGES_PER_PAGE}&client_id=${UNSPLASH_API_KEY}`
        }
        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`Failed to fetch images: ${response.status}`)
        }
        const data = await response.json()
        if (currentQuery) {
            totalPages = data.total_pages
            if (data.results.length === 0 && resetGrid) {
                imageGrid.innerHTML = '<div class="no-results"><h3>No results found</h3><p>Try different keywords or browse our categories</p></div>'
                showLoading(false)
                return
            }
            if (resetGrid) {
                currentImages = [...data.results]
            } else {
                currentImages = [...currentImages, ...data.results]
            }
            displayImages(data.results, resetGrid)
        } else {
            if (resetGrid) {
                currentImages = [...data]
            } else {
                currentImages = [...currentImages, ...data]
            }
            displayImages(data, resetGrid)
        }
        if (currentQuery && currentPage >= totalPages) {
            loadMoreBtn.style.display = "none"
        } else {
            loadMoreBtn.style.display = "block"
        }
    } catch (error) {
        console.error("Error loading images:", error)
        imageGrid.innerHTML = '<div class="error-message"><h3>Error loading images</h3><p>Please try again later</p></div>'
    } finally {
        showLoading(false)
    }
}

// Display images in the grid
function displayImages(images, resetGrid = true) {
    if (resetGrid) {
        imageGrid.innerHTML = ""
    }
    images.forEach((image) => {
        const card = createImageCard(image)
        imageGrid.appendChild(card)
    })
    resizeMasonryItems()
    updateLikeButtonsUI()
}

// Create an image card element
function createImageCard(image) {
    const card = document.createElement("div")
    card.className = "image-card"
    card.setAttribute("data-image-id", image.id)
    
    const aspectRatio = image.height / image.width
    const rowSpan = Math.ceil(aspectRatio * 30)
    card.style.gridRowEnd = `span ${rowSpan}`
    
    card.innerHTML = `
        <img src="${image.urls.regular}" alt="${image.alt_description || 'Unsplash image'}" loading="lazy">
        <div class="card-overlay">
            <div class="card-info">
                <h3 class="card-title">${image.description || image.alt_description || 'Untitled'}</h3>
                <p class="card-author">By ${image.user.name}</p>
            </div>
        </div>
        <div class="card-actions">
            <button class="card-btn like-btn" data-image-id="${image.id}">
                <i class="${likedImages.has(image.id) ? 'fas fa-heart' : 'far fa-heart'}"></i>
            </button>
            <button class="card-btn download-btn" data-image-id="${image.id}">
                <i class="fas fa-download"></i>
            </button>
            <button class="card-btn share-btn" data-image-id="${image.id}">
                <i class="fas fa-share-alt"></i>
            </button>
        </div>
    `
    
    // Add event listeners with stopPropagation to prevent lightbox from opening
    const likeBtn = card.querySelector('.like-btn')
    likeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        toggleLike(image.id)
    })
    
    const downloadBtn = card.querySelector('.download-btn')
    downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        downloadImage(image.urls.full, image.id)
    })
    
    const shareBtn = card.querySelector('.share-btn')
    shareBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        shareImage(image.id)
    })
    
    // Add click event to open lightbox (only when clicking on the image or overlay)
    card.addEventListener("click", () => {
        openLightbox(image)
    })
    
    return card
}

// Handle search functionality
function handleSearch() {
    const query = searchInput.value.trim()
    if (query === "") return
    currentQuery = query
    setActiveFilter(document.querySelector('.filter-btn[data-filter="all"]'))
    addSearchTag(query)
    searchInput.value = ""
    loadImages()
    categoriesSection.scrollIntoView({ behavior: "smooth" })
}

// Add a search tag
function addSearchTag(tag) {
    if (activeSearchTags.includes(tag)) return
    activeSearchTags.push(tag)
    const searchTagsContainer = document.querySelector('.search-tags') || createSearchTagsContainer()
    const tagElement = document.createElement('button')
    tagElement.className = 'filter-btn search-tag'
    tagElement.innerHTML = `
        <span class="filter-text">${tag}</span>
        <span class="remove-filter" data-tag="${tag}">×</span>
    `
    const removeBtn = tagElement.querySelector('.remove-filter')
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        removeSearchTag(tag)
    })
    searchTagsContainer.appendChild(tagElement)
}

// Create search tags container
function createSearchTagsContainer() {
    const container = document.createElement('div')
    container.className = 'search-tags'
    const categoryFilters = document.querySelector('.category-filters')
    categoryFilters.parentNode.insertBefore(container, categoryFilters.nextSibling)
    return container
}

// Remove a search tag
function removeSearchTag(tag) {
    activeSearchTags = activeSearchTags.filter(t => t !== tag)
    const tagElements = document.querySelectorAll('.search-tag')
    tagElements.forEach(el => {
        const removeBtn = el.querySelector('.remove-filter')
        if (removeBtn && removeBtn.getAttribute('data-tag') === tag) {
            el.remove()
        }
    })
    if (activeSearchTags.length === 0) {
        const container = document.querySelector('.search-tags')
        if (container) container.remove()
        currentQuery = ''
        loadImages()
    } else {
        currentQuery = activeSearchTags.join(' ')
        loadImages()
    }
}

// Set active filter
function setActiveFilter(button) {
    filterButtons.forEach(btn => btn.classList.remove('active'))
    button.classList.add('active')
}

// Filter images by category
function filterImages(filter) {
    currentCategory = filter
    if (filter === 'all') {
        loadImages()
        return
    }
    const previousQuery = currentQuery
    currentQuery = filter
    if (previousQuery && previousQuery !== filter) {
        currentQuery = `${filter} ${previousQuery}`
    }
    loadImages()
}

// Show/hide loading spinner
function showLoading(show) {
    if (!loadingSpinner) return
    loadingSpinner.style.display = show ? 'flex' : 'none'
    if (loadMoreBtn) {
        loadMoreBtn.style.display = show ? 'none' : 'block'
    }
}

// Resize masonry items
function resizeMasonryItems() {
    const imageCards = document.querySelectorAll('.image-card')
    imageCards.forEach(card => {
        const img = card.querySelector('img')
        if (img.complete) {
            updateCardHeight(card, img)
        } else {
            img.addEventListener('load', () => {
                updateCardHeight(card, img)
            })
        }
    })
}

// Update card height based on image aspect ratio
function updateCardHeight(card, img) {
    const aspectRatio = img.naturalHeight / img.naturalWidth
    const rowSpan = Math.ceil(aspectRatio * 30)
    card.style.gridRowEnd = `span ${rowSpan}`
}

// Toggle like functionality
function toggleLike(imageId) {
    if (likedImages.has(imageId)) {
        likedImages.delete(imageId)
    } else {
        likedImages.add(imageId)
    }
    updateLikeButtonsUI()
    saveLikedImagesToStorage()
}

// Update like buttons UI
function updateLikeButtonsUI() {
    const likeButtons = document.querySelectorAll(".like-btn")
    likeButtons.forEach((button) => {
        const imageId = button.getAttribute("data-image-id")
        if (likedImages.has(imageId)) {
            button.classList.add("liked")
            button.querySelector("i").className = "fas fa-heart"
        } else {
            button.classList.remove("liked")
            button.querySelector("i").className = "far fa-heart"
        }
    })
    
    // Update lightbox like button if open
    const lightboxLikeBtn = document.querySelector(".lightbox-actions .like-btn")
    if (lightboxLikeBtn && currentImages.length > 0) {
        const currentImage = currentImages[currentLightboxIndex]
        if (currentImage && likedImages.has(currentImage.id)) {
            lightboxLikeBtn.classList.add("liked")
            lightboxLikeBtn.querySelector("i").className = "fas fa-heart"
        } else {
            lightboxLikeBtn.classList.remove("liked")
            lightboxLikeBtn.querySelector("i").className = "far fa-heart"
        }
    }
}

// Open lightbox
function openLightbox(image) {
    if (!lightbox) return
    currentLightboxIndex = currentImages.findIndex((img) => img.id === image.id)
    lightboxImage.src = image.urls.regular
    lightboxTitle.textContent = image.description || image.alt_description || "Untitled"
    lightboxAuthor.textContent = `By ${image.user.name}`
    downloadLink.href = image.urls.full
    downloadLink.setAttribute("download", `unsplash-${image.id}.jpg`)
    
    // Update like button in lightbox
    const lightboxLikeBtn = document.querySelector(".lightbox-actions .like-btn")
    if (lightboxLikeBtn) {
        lightboxLikeBtn.setAttribute("onclick", `toggleLike('${image.id}')`)
        if (likedImages.has(image.id)) {
            lightboxLikeBtn.classList.add("liked")
            lightboxLikeBtn.querySelector("i").className = "fas fa-heart"
        } else {
            lightboxLikeBtn.classList.remove("liked")
            lightboxLikeBtn.querySelector("i").className = "far fa-heart"
        }
    }
    
    lightbox.classList.add("active")
    document.body.style.overflow = "hidden"
}

// Close lightbox
function closeLightbox() {
    lightbox.classList.remove("active")
    document.body.style.overflow = ""
}

// Show previous image in lightbox
function showPrevImage() {
    if (currentLightboxIndex > 0) {
        currentLightboxIndex--
        const prevImage = currentImages[currentLightboxIndex]
        openLightbox(prevImage)
    }
}

// Show next image in lightbox
function showNextImage() {
    if (currentLightboxIndex < currentImages.length - 1) {
        currentLightboxIndex++
        const nextImage = currentImages[currentLightboxIndex]
        openLightbox(nextImage)
    }
}

// Download image function
async function downloadImage(imageUrl, imageId) {
    try {
        // Show loading indicator on the download button
        const downloadBtn = document.querySelector(`.download-btn[data-image-id="${imageId}"]`)
        if (downloadBtn) {
            downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'
        }
        
        // Fetch the image
        const response = await fetch(imageUrl)
        if (!response.ok) throw new Error('Failed to fetch image')
        
        // Convert to blob
        const blob = await response.blob()
        
        // Create object URL
        const url = URL.createObjectURL(blob)
        
        // Create download link
        const a = document.createElement('a')
        a.href = url
        a.download = `unsplash-${imageId}.jpg`
        document.body.appendChild(a)
        
        // Trigger download
        a.click()
        
        // Clean up
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        // Restore button
        if (downloadBtn) {
            downloadBtn.innerHTML = '<i class="fas fa-download"></i>'
        }
    } catch (error) {
        console.error('Download failed:', error)
        alert('Failed to download image. Please try again.')
        
        // Restore button on error
        const downloadBtn = document.querySelector(`.download-btn[data-image-id="${imageId}"]`)
        if (downloadBtn) {
            downloadBtn.innerHTML = '<i class="fas fa-download"></i>'
        }
    }
}

// Share image function
function shareImage(imageId) {
    const image = currentImages.find(img => img.id === imageId)
    if (!image) return
    
    const shareUrl = `https://unsplash.com/photos/${imageId}`
    const shareTitle = image.description || image.alt_description || 'Check out this image!'
    const shareText = `Photo by ${image.user.name} on Unsplash`
    
    if (navigator.share) {
        navigator.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl
        }).then(() => console.log('Shared successfully'))
        .catch(error => {
            console.error('Error sharing:', error)
            fallbackShare(shareUrl)
        })
    } else {
        fallbackShare(shareUrl)
    }
}

// Fallback share method (copy to clipboard)
function fallbackShare(url) {
    const tempInput = document.createElement('input')
    document.body.appendChild(tempInput)
    tempInput.value = url
    tempInput.select()
    document.execCommand('copy')
    document.body.removeChild(tempInput)
    
    alert('Link copied to clipboard!')
}


// Dark mode toggle functionality
function setupDarkModeToggle() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const body = document.body;
    
    // Check for saved dark mode preference
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    
    // Set initial dark mode state
    if (isDarkMode) {
      body.classList.add('dark-mode');
      darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    // Toggle dark mode
    darkModeToggle.addEventListener('click', () => {
      body.classList.toggle('dark-mode');
      const isDarkModeNow = body.classList.contains('dark-mode');
      localStorage.setItem('darkMode', isDarkModeNow);
      darkModeToggle.innerHTML = isDarkModeNow ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    });
  }
  
  // Call this function in your DOMContentLoaded event listener
  document.addEventListener("DOMContentLoaded", () => {
    // Existing code...
    setupDarkModeToggle();
  });

  // Replace authentication functions with localStorage
function checkAuthenticationStatus() {
    const userData = localStorage.getItem('user');
    if (userData) {
      isAuthenticated = true;
      updateUIForLoggedInUser(JSON.parse(userData));
      fetchLikedImages();
    } else {
      isAuthenticated = false;
      updateUIForLoggedOutUser();
    }
  }
  
  // Replace server logout with localStorage clear
  function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('likedImages');
    isAuthenticated = false;
    updateUIForLoggedOutUser();
    likedImages.clear();
    updateLikeButtonsUI();
    window.location.href = "index.html";
  }
  
  // Store liked images in localStorage
  function fetchLikedImages() {
    if (!isAuthenticated) return;
    
    const storedLikedImages = localStorage.getItem('likedImages');
    if (storedLikedImages) {
      const likedImagesData = JSON.parse(storedLikedImages);
      likedImages = new Set(likedImagesData.map(img => img.id));
      updateLikeButtonsUI();
    }
  }
  
  // Update toggleLike function to use localStorage
  function toggleLike(imageId) {
    if (!isAuthenticated) {
      // Redirect to login or show login modal
      sessionStorage.setItem("redirectUrl", window.location.href);
      window.location.href = "login.html";
      return;
    }
    
    const image = currentImages.find(img => img.id === imageId);
    if (!image) return;
    
    let storedLikedImages = [];
    const storedData = localStorage.getItem('likedImages');
    if (storedData) {
      storedLikedImages = JSON.parse(storedData);
    }
    
    if (likedImages.has(imageId)) {
      // Unlike the image
      likedImages.delete(imageId);
      storedLikedImages = storedLikedImages.filter(img => img.id !== imageId);
    } else {
      // Like the image
      likedImages.add(imageId);
      const imageData = {
        id: image.id,
        url: image.urls.regular,
        description: image.description || image.alt_description || "Untitled",
        author: image.user.name,
        thumbnail: image.urls.thumb || image.urls.small,
        alt_text: image.alt_description || "Unsplash image"
      };
      storedLikedImages.push(imageData);
    }
    
    localStorage.setItem('likedImages', JSON.stringify(storedLikedImages));
    updateLikeButtonsUI();
  }
  
  