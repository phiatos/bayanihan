// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDJxMv8GCaMvQT2QBW3CdzA3dV5X_T2KqQ",
  authDomain: "bayanihan-5ce7e.firebaseapp.com",
  databaseURL: "https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bayanihan-5ce7e",
  storageBucket: "bayanihan-5ce7e.firebasestorage.app",
  messagingSenderId: "593123849917",
  appId: "1:593123849917:web:eb85a63a536eeff78ce9d4",
  measurementId: "G-ZTQ9VXXVV0"
};

let auth, database, storage;
try {
  if (!firebase) {
    throw new Error('Firebase SDK is not defined. Ensure Firebase scripts are loaded.');
  }
  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  database = firebase.database();
  storage = firebase.storage();
  console.log(`[${new Date().toISOString()}] Firebase initialized successfully`);
} catch (error) {
  console.error(`[${new Date().toISOString()}] Firebase initialization failed:`, error.message, error.stack);
  Swal.fire({
    icon: 'error',
    title: 'Firebase Initialization Failed',
    text: `Error: ${error.message}. Please check your Firebase configuration and ensure all SDK scripts are included.`,
  });
}

let user = null;
const userOrgCache = new Map();
let sortOrder = 'newest';
let selectedCategoryFilter = 'all';
let inactivityTimeout;
const INACTIVITY_TIME = 1800000;

// Reset inactivity timer
function resetInactivityTimer() {
  clearTimeout(inactivityTimeout);
  inactivityTimeout = setTimeout(checkInactivity, INACTIVITY_TIME);
  // console.log(`[${new Date().toISOString()}] Inactivity timer reset.`);
}

// Check for user inactivity
function checkInactivity() {
  Swal.fire({
    title: 'Are you still there?',
    text: 'You\'ve been inactive for a while. Do you want to continue your session or log out?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Stay Logged In',
    cancelButtonText: 'Log Out',
    allowOutsideClick: false,
    reverseButtons: true
  }).then((result) => {
    if (result.isConfirmed) {
      resetInactivityTimer();
      console.log(`[${new Date().toISOString()}] User chose to continue session.`);
    } else if (result.dismiss === Swal.DismissReason.cancel) {
      auth.signOut().then(() => {
        console.log(`[${new Date().toISOString()}] User logged out due to inactivity.`);
        window.location.href = "../pages/login.html";
      }).catch((error) => {
        console.error(`[${new Date().toISOString()}] Error logging out:`, error);
        Swal.fire('Error', 'Failed to log out. Please try again.', 'error');
      });
    }
  });
}

['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
  document.addEventListener(eventType, resetInactivityTimer);
});

// Compress media
async function compressMedia(file) {
  const storage = firebase.storage();
  const storageRef = storage.ref();
  const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const fileRef = storageRef.child(`media/${fileName}`);

  if (file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxDimension = 800;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDimension) {
          height *= maxDimension / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width *= maxDimension / height;
          height = maxDimension;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(async (blob) => {
          try {
            const uploadTask = await fileRef.put(blob, { contentType: file.type });
            const downloadUrl = await uploadTask.ref.getDownloadURL();
            console.log(`[${new Date().toISOString()}] Image uploaded to Storage: ${downloadUrl}`);
            resolve({ mediaUrl: downloadUrl, mediaType: 'image' });
          } catch (error) {
            console.error(`[${new Date().toISOString()}] Image upload failed:`, error);
            reject(error);
          }
        }, file.type, 0.5);
      };
      img.onerror = (error) => {
        console.error(`[${new Date().toISOString()}] Image processing failed:`, error);
        reject(error);
      };
    });
  } else if (file.type.startsWith('video/')) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.onloadedmetadata = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxDimension = 800;
        let width = video.videoWidth;
        let height = video.videoHeight;

        if (width > height && width > maxDimension) {
          height *= maxDimension / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width *= maxDimension / height;
          height = maxDimension;
        }

        canvas.width = width;
        canvas.height = height;
        video.currentTime = 0;

        const generateThumbnail = async () => {
          ctx.drawImage(video, 0, 0, width, height);
          canvas.toBlob(async (thumbnailBlob) => {
            try {
              const thumbnailRef = storageRef.child(`thumbnails/${fileName}.jpg`);
              const thumbnailUpload = await thumbnailRef.put(thumbnailBlob, { contentType: 'image/jpeg' });
              const thumbnailUrl = await thumbnailUpload.ref.getDownloadURL();
              const videoUpload = await fileRef.put(file, { contentType: file.type });
              const videoUrl = await videoUpload.ref.getDownloadURL();
              console.log(`[${new Date().toISOString()}] Video uploaded: ${videoUrl}, Thumbnail: ${thumbnailUrl}`);
              resolve({ mediaUrl: videoUrl, thumbnailUrl, mediaType: 'video' });
            } catch (error) {
              console.error(`[${new Date().toISOString()}] Video/thumbnail upload failed:`, error);
              reject(error);
            }
          }, 'image/jpeg', 0.5);
        };

        video.onseeked = generateThumbnail;
        video.onerror = (error) => {
          console.error(`[${new Date().toISOString()}] Video processing failed:`, error);
          reject(error);
        };

        video.play().catch(() => {
          video.currentTime = 0;
        });
      };
      video.onerror = (error) => {
        console.error(`[${new Date().toISOString()}] Video metadata load failed:`, error);
        reject(error);
      };
    });
  } else {
    return Promise.reject(new Error('Unsupported media type'));
  }
}

// Upload media to Storage
async function uploadMediaToStorage(file, path, mimeType) {
  try {
    console.log(`[${new Date().toISOString()}] Uploading to Firebase Storage at path: ${path}`);
    const storageRef = storage.ref(path);
    const metadata = { contentType: mimeType };
    const uploadTask = storageRef.put(file, metadata);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          console.log(`[${new Date().toISOString()}] Upload progress: ${((snapshot.bytesTransferred / snapshot.totalBytes) * 100).toFixed(2)}%`);
        },
        (error) => {
          console.error(`[${new Date().toISOString()}] Upload failed:`, error.code, error.message);
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
            console.log(`[${new Date().toISOString()}] Download URL obtained: ${downloadURL}`);
            if (!downloadURL.startsWith('https://')) {
              throw new Error('Invalid download URL');
            }
            resolve(downloadURL);
          } catch (urlError) {
            console.error(`[${new Date().toISOString()}] Error getting download URL:`, urlError);
            reject(urlError);
          }
        }
      );
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error uploading media:`, error);
    throw error;
  }
}

// Fetch user data with fallback
async function fetchUserData(uid) {
  if (!uid) {
    console.error(`[${new Date().toISOString()}] fetchUserData: No UID provided`);
    return { contactPerson: 'Anonymous', organization: '' };
  }

  if (userOrgCache.has(uid)) {
    console.log(`[${new Date().toISOString()}] Using cached user data for user: ${uid}`);
    return userOrgCache.get(uid);
  }

  try {
    console.log(`[${new Date().toISOString()}] Fetching user data for user: ${uid}`);
    const snapshot = await database.ref(`users/${uid}`).once('value');
    const userData = snapshot.val() || {};
    let contactPerson = userData.contactPerson ||
      (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : null) ||
      userData.displayName ||
      (auth.currentUser?.displayName) ||
      (auth.currentUser?.email?.split('@')[0]) ||
      'Anonymous';
    
    const data = {
      contactPerson,
      organization: userData.organization || ''
    };
    userOrgCache.set(uid, data);
    console.log(`[${new Date().toISOString()}] User data fetched:`, data);
    return data;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching user data:`, error);
    return {
      contactPerson: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Anonymous',
      organization: ''
    };
  }
}

// Display images in preview
function displayImages(imageUrls, containerId = 'modal-media-preview') {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`[${new Date().toISOString()}] Image container not found: ${containerId}`);
    Swal.fire({
      icon: 'error',
      title: 'Preview Error',
      text: 'Media preview container not found. Please try reloading the page.',
      confirmButtonText: 'Reload'
    }).then(() => {
      window.location.reload();
    });
    return;
  }

  container.innerHTML = '';
  if (imageUrls.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #666;">No media in preview.</p>';
    return;
  }

  imageUrls.forEach(({ name, url }) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'preview-item';
    const img = document.createElement('img');
    img.src = url;
    img.className = 'media-preview';
    img.alt = name;
    img.onerror = () => {
      console.error(`[${new Date().toISOString()}] Image load failed: ${url}`);
      img.style.display = 'none';
      img.nextElementSibling.style.display = 'block';
    };
    const errorDiv = document.createElement('div');
    errorDiv.style.display = 'none';
    errorDiv.style.color = 'red';
    errorDiv.style.textAlign = 'center';
    errorDiv.style.fontSize = '14px';
    const dimensionsDiv = document.createElement('div');
    dimensionsDiv.className = 'media-dimensions';
    const imgForDimensions = new Image();
    imgForDimensions.src = url;
    imgForDimensions.onload = () => {
      dimensionsDiv.textContent = `${imgForDimensions.naturalWidth} × ${imgForDimensions.naturalHeight}`;
    };
    imgForDimensions.onerror = () => {
      dimensionsDiv.textContent = 'Error loading dimensions';
    };
    itemDiv.appendChild(img);
    itemDiv.appendChild(errorDiv);
    itemDiv.appendChild(dimensionsDiv);
    container.appendChild(itemDiv);
  });
}

// Auth state listener
auth.onAuthStateChanged(async (currentUser) => {
  user = currentUser;
  console.log(`[${new Date().toISOString()}] Auth state changed:`, currentUser ? { uid: currentUser.uid, displayName: currentUser.displayName, email: currentUser.email } : 'No user');

  if (user) {
    const profilePage = 'profile.html';
    try {
      const userSnapshot = await database.ref(`users/${user.uid}`).once("value");
      const userDataFromDb = userSnapshot.val();
      const passwordNeedsReset = userDataFromDb ? (userDataFromDb.password_needs_reset || false) : false;

      if (passwordNeedsReset) {
        console.log(`[${new Date().toISOString()}] Password change required for user ${user.uid}. Redirecting to profile page.`);
        Swal.fire({
          icon: 'info',
          title: 'Password Change Required',
          text: 'For security reasons, please change your password. You will be redirected to your profile.',
          allowOutsideClick: false,
          allowEscapeKey: false,
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true
        }).then(() => {
          window.location.replace(`../pages/${profilePage}`);
        });
        return;
      }

      loadPosts();
      loadActivityLog();
      const userData = await fetchUserData(user.uid);
      updateModalUserInfo(userData);
      resetInactivityTimer();
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error checking password reset status or fetching user data:`, error);
      Swal.fire({
        icon: 'error',
        title: 'Authentication Error',
        text: 'Failed to verify account status. Please try logging in again.',
      }).then(() => {
        window.location.replace('../pages/login.html');
      });
      return;
    }
  } else {
    Swal.fire({
      title: 'Authentication Required',
      text: 'Please log in to post or view posts.',
      icon: 'warning',
      confirmButtonText: 'OK'
    }).then(() => {
      window.location.replace('../pages/login.html');
    });
    const postsContainer = document.getElementById('posts');
    if (postsContainer) {
      postsContainer.innerHTML = '<p style="text-align: center; color: #666;">Please log in to view posts.</p>';
    }
  }
});

// Update modal user info
function updateModalUserInfo(userData) {
  const userName = document.getElementById('modal-user-name');
  const userOrg = document.getElementById('modal-user-org');
  const shareUserName = document.getElementById('share-modal-user-name');
  if (userName && userOrg) {
    userName.textContent = userData.contactPerson || 'Anonymous';
    userOrg.textContent = userData.organization || '';
    console.log(`[${new Date().toISOString()}] Updated modal user info: ${userData.contactPerson}, ${userData.organization}`);
  }
  if (shareUserName) {
    shareUserName.textContent = userData.contactPerson || 'Anonymous';
  }
}

// Create post
async function createPost() {
  console.log(`[${new Date().toISOString()}] createPost called`);
  if (!user) {
    console.log(`[${new Date().toISOString()}] No user logged in`);
    Swal.fire('Please log in to post', '', 'warning');
    return;
  }

  await new Promise(resolve => setTimeout(resolve, 0));

  const modalPostTitle = document.getElementById('modal-post-title');
  const modalPostContent = document.getElementById('modal-post-content');
  const modalPostCategory = document.getElementById('modal-post-category');
  const mediaInput = document.getElementById('modal-media-upload');
  const postButton = document.getElementById('modal-post-button');
  const modal = document.getElementById('post-modal');
  const mediaPreview = document.getElementById('modal-media-preview');

  if (!modalPostTitle || !modalPostContent || !modalPostCategory || !mediaInput || !postButton || !modal || !mediaPreview) {
    console.error(`[${new Date().toISOString()}] DOM elements missing:`, { modalPostTitle, modalPostContent, modalPostCategory, mediaInput, postButton, modal, mediaPreview });
    Swal.fire('Error', 'Page elements not found. Please try refreshing the page.', 'error');
    return;
  }

  const title = modalPostTitle.value.trim();
  const content = modalPostContent.value.trim();
  const category = modalPostCategory.value;
  const files = Array.from(mediaInput.files); // Support multiple files
  if (!title && !category && !content && !files.length) {
    console.log(`[${new Date().toISOString()}] Fields are blank`);
    Swal.fire('Missing Fields', 'Please fill all the fields', 'warning');
    return;
  }
  if (!content && !files.length) {
    console.log(`[${new Date().toISOString()}] No content or media provided`);
    Swal.fire('Missing Field', 'Please add content or media to post', 'warning');
    return;
  }
  if (!category) {
    console.log(`[${new Date().toISOString()}] No category selected`);
    Swal.fire('Please select a category', '', 'warning');
    return;
  }

  console.log(`[${new Date().toISOString()}] Posting with title: ${title}, content: ${content}, category: ${category}, files: ${files.map(f => f.name).join(', ')}`);
  postButton.classList.add('loading');
  modal.classList.add('disabled');

  try {
    const mediaUrls = [];
    let mediaType = '';
    if (files.length) {
      for (const file of files) {
        if (!['image/jpeg', 'image/png', 'video/mp4', 'video/webm'].includes(file.type)) {
          console.log(`[${new Date().toISOString()}] Invalid file type: ${file.type}`);
          Swal.fire('Unsupported file type', 'Please upload JPEG, PNG, MP4, or WebM files', 'error');
          mediaInput.value = null;
          mediaPreview.innerHTML = '';
          throw new Error('Unsupported file type');
        }
        if (file.size > 5 * 1024 * 1024) {
          console.log(`[${new Date().toISOString()}] File size exceeds 5MB limit`);
          Swal.fire('File too large', 'Maximum file size is 5MB', 'error');
          mediaInput.value = null;
          mediaPreview.innerHTML = '';
          throw new Error('File size exceeds 5MB');
        }

        const result = await compressMedia(file);
        mediaUrls.push({
          url: result.mediaUrl,
          type: result.mediaType,
          thumbnail: result.thumbnailUrl || ''
        });
        mediaType = result.mediaType; // Use the last file's type (assumes single type per post)
      }
    }

    const { contactPerson, organization } = await fetchUserData(user.uid);
    let userName = contactPerson;
    if (organization && contactPerson.firstName && contactPerson.lastName) {
      userName = `${contactPerson.firstName} ${contactPerson.lastName}`.trim();
    }

    const post = {
      title: title || '',
      content: content,
      userId: user.uid,
      userName: userName,
      organization: organization,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      mediaUrls: mediaUrls.length ? mediaUrls : [], // Store as array
      mediaType: mediaType,
      category: category
    };

    console.log(`[${new Date().toISOString()}] Writing post to database:`, { ...post, mediaUrls: mediaUrls.map(m => m.url.slice(0, 50) + '...') });
    await database.ref('posts').push(post);
    await logActivity(`${userName}${organization ? ` from ${organization}` : ''} created a new post in ${category}`);
    modalPostTitle.value = '';
    modalPostContent.value = '';
    modalPostCategory.value = '';
    mediaInput.value = '';
    mediaPreview.innerHTML = '';
    modal.style.display = 'none';
    modalPostContent.style.height = '80px';
    console.log(`[${new Date().toISOString()}] Post created successfully`);
    Swal.fire('Success', 'Post created successfully!', 'success');

    const modalButtons = modal.querySelectorAll('.modal-buttons .post-option');
    modalButtons.forEach(btn => btn.style.display = 'inline-block');
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error creating post:`, error.message);
    Swal.fire('Error', `Failed to create post: ${error.message}`, 'error');
  } finally {
    postButton.classList.remove('loading');
    modal.classList.remove('disabled');
  }
}

// Share post
async function sharePost(id) {
  console.log(`[${new Date().toISOString()}] sharePost called for post: ${id}`);
  if (!user) {
    Swal.fire('Please log in to share posts', '', 'warning');
    return;
  }

  const modal = document.getElementById('share-post-modal');
  const shareContent = document.getElementById('share-post-content');
  const shareCaptionInput = document.getElementById('share-caption-input');
  const originalCreator = document.getElementById('share-original-creator');
  if (!modal || !shareContent || !shareCaptionInput || !originalCreator) {
    console.error(`[${new Date().toISOString()}] Share modal elements missing`);
    Swal.fire('Error', 'Share modal elements not found. Please try refreshing the page.', 'error');
    return;
  }

  try {
    const postSnapshot = await database.ref(`posts/submitted/${id}`).once('value');
    const originalPost = postSnapshot.val();
    if (!originalPost) {
      console.error(`[${new Date().toISOString()}] Post not found: ${id}`);
      Swal.fire('Error', 'Post not found', 'error');
      return;
    }

    const { contactPerson } = await fetchUserData(user.uid);
    modal.dataset.postId = id;
    originalCreator.textContent = originalPost.userName || 'Anonymous';
    let mediaHtml = '';
    if (originalPost.media && Array.isArray(originalPost.media)) {
      mediaHtml = originalPost.media.map((item, index) => {
        if (item.type === 'image') {
          return `<img src="${item.url}" class="post-media" alt="Post media ${index}" onerror="this.style.display='none';this.nextElementSibling.style.display='block';console.error('Image load failed for post ${id}, index ${index}: ${item.url}')">`;
        } else if (item.type === 'video') {
          return `
            <video id="video-${id}-${index}" src="${item.url}" class="post-media" poster="${item.thumbnail || ''}" controls></video>
          `;
        }
      }).join('');
    }

    shareContent.innerHTML = `
      ${originalPost.title ? `<h4 class="post-title">${originalPost.title}</h4>` : ''}
      ${originalPost.content ? `<p class="post-content">${originalPost.content}</p>` : '<p class="post-content">No content</p>'}
      ${mediaHtml}
    `;
    shareCaptionInput.value = '';
    modal.style.display = 'block';
    shareCaptionInput.focus();

    // Video playback with retry logic
    if (originalPost.media && Array.isArray(originalPost.media)) {
      originalPost.media.forEach((item, index) => {
        if (item.type === 'video') {
          const videoElement = document.getElementById(`video-${id}-${index}`);
          let retries = 0;
          const maxRetries = 3;

          const attemptPlay = () => {
            if (!videoElement) return;
            videoElement.play().catch((error) => {
              console.error(`[${new Date().toISOString()}] Video playback failed for post ${id}, attempt ${retries + 1}:`, error);
              if (retries < maxRetries) {
                retries++;
                console.log(`[${new Date().toISOString()}] Retrying video playback for post ${id}, attempt ${retries}`);
                setTimeout(attemptPlay, 1000 * retries);
              } else {
                console.error(`[${new Date().toISOString()}] Max retries reached for video in post ${id}`);
                videoElement.nextElementSibling.style.display = 'block';
                videoElement.style.display = 'none';
              }
            });
          };

          videoElement.addEventListener('loadeddata', () => {
            console.log(`[${new Date().toISOString()}] Video loaded successfully for post ${id}`);
            retries = 0;
          });

          attemptPlay();
        }
      });
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error preparing share modal:`, error);
    Swal.fire('Error', 'Failed to load post for sharing.', 'error');
  }
}

// Submit shared post
async function submitSharePost() {
  console.log(`[${new Date().toISOString()}] submitSharePost called`);
  if (!user) {
    Swal.fire('Please log in to share posts', '', 'warning');
    return;
  }

  const modal = document.getElementById('share-post-modal');
  const shareCaptionInput = document.getElementById('share-caption-input');
  const modalPostCategory = document.getElementById('share-modal-post-category');
  if (!modal || !shareCaptionInput || !modalPostCategory) {
    console.error(`[${new Date().toISOString()}] Share modal elements missing`);
    Swal.fire('Error', 'Share modal elements not found.', 'error');
    return;
  }

  const postId = modal.dataset.postId;
  const category = modalPostCategory.value || 'discussion';
  if (!postId) {
    console.error(`[${new Date().toISOString()}] Post ID not set in share modal`);
    Swal.fire('Error', 'Invalid post ID.', 'error');
    return;
  }

  const caption = shareCaptionInput.value.trim();
  try {
    const postSnapshot = await database.ref(`posts/submitted/${postId}`).once('value');
    const originalPost = postSnapshot.val();
    if (!originalPost) {
      Swal.fire('Error', 'Post not found', 'error');
      return;
    }

    const { contactPerson, organization } = await fetchUserData(user.uid);
    const sanitizedMedia = Array.isArray(originalPost.media)
      ? originalPost.media.filter(item => item && item.url && item.type)
      : [];
    const sharedPost = {
      title: originalPost.title || '',
      content: originalPost.content || '',
      userId: user.uid,
      userName: contactPerson,
      organization: organization,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      media: sanitizedMedia.length > 0 ? sanitizedMedia : null,
      originalPostId: postId,
      originalUserName: originalPost.userName || 'Anonymous',
      isShared: true,
      shareCaption: caption || '',
      category: category
    };

    await database.ref('posts/submitted').push(sharedPost);
    await logActivity(`${contactPerson}${organization ? ` from ${organization}` : ''} shared a post in ${category}`);
    modal.style.display = 'none';
    shareCaptionInput.value = '';
    modalPostCategory.value = '';
    delete modal.dataset.postId;
    Swal.fire('Success', 'Post shared successfully!', 'success');
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error sharing post:`, error);
    Swal.fire('Error', `Failed to share post: ${error.message}`, 'error');
  }
}

// Comment functions
async function addComment(postId, parentCommentId = null) {
  console.log(`[${new Date().toISOString()}] addComment called for post: ${postId}, parent: ${parentCommentId}`);
  if (!user) {
    Swal.fire('Please log in to comment', '', 'warning');
    return;
  }

  const commentInput = document.getElementById(parentCommentId ? `reply-input-${parentCommentId}` : `comment-input-${postId}`);
  if (!commentInput) {
    console.error(`[${new Date().toISOString()}] Comment input not found for post: ${postId}, parent: ${parentCommentId}`);
    return;
  }

  const commentText = commentInput.value.trim();
  if (!commentText) {
    Swal.fire('Please enter a comment', '', 'warning');
    return;
  }

  Swal.fire({
    title: 'Post Comment',
    text: 'Are you sure you want to post this comment?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'No'
  }).then(async (result) => {
    if (result.isConfirmed) {
      const { contactPerson, organization } = await fetchUserData(user.uid);
      const comment = {
        userId: user.uid,
        userName: contactPerson,
        text: commentText,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        parentCommentId: parentCommentId || null
      };

      try {
        await database.ref(`posts/submitted/${postId}/comments`).push(comment);
        commentInput.value = '';
        await logActivity(`${contactPerson}${organization ? ` from ${organization}` : ''} ${parentCommentId ? 'replied to' : 'commented on'} a post`);
        Swal.fire('Success', 'Comment posted successfully!', 'success');
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error adding comment:`, error);
        Swal.fire('Error', `Failed to add comment: ${error.message}`, 'error');
      }
    }
  });
}

async function deleteComment(postId, commentId) {
  console.log(`[${new Date().toISOString()}] deleteComment called for post: ${postId}, comment: ${commentId}`);
  if (!user) {
    Swal.fire('Please log in to delete comments', '', 'warning');
    return;
  }

  const commentRef = database.ref(`posts/submitted/${postId}/comments/${commentId}`);
  const comment = (await commentRef.once('value')).val();
  if (!comment || user.uid !== comment.userId) {
    Swal.fire('Error', 'You are not authorized to delete this comment.', 'error');
    return;
  }

  Swal.fire({
    title: 'Delete Comment',
    text: 'Are you sure you want to delete this comment and its replies?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'No'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const subCommentsSnapshot = await database.ref(`posts/submitted/${postId}/comments`).orderByChild('parentCommentId').equalTo(commentId).once('value');
        const subComments = subCommentsSnapshot.val();
        if (subComments) {
          for (const subCommentId of Object.keys(subComments)) {
            await database.ref(`posts/submitted/${postId}/comments/${subCommentId}`).remove();
          }
        }
        await commentRef.remove();
        const { contactPerson, organization } = await fetchUserData(user.uid);
        await logActivity(`${contactPerson}${organization ? ` from ${organization}` : ''} deleted a comment`);
        Swal.fire('Success', 'Comment deleted successfully!', 'success');
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error deleting comment:`, error);
        Swal.fire('Error', `Failed to delete comment: ${error.message}`, 'error');
      }
    }
  });
}

function toggleComments(postId) {
  const commentsSection = document.getElementById(`comments-section-${postId}`);
  const commentButton = document.querySelector(`#post-${postId} .comment-button`);
  const commentCounter = document.querySelector(`#post-${postId} .comment-counter`);
  if (commentsSection && commentButton && commentCounter) {
    if (commentsSection.style.display === 'none' || !commentsSection.style.display) {
      commentsSection.style.display = 'block';
      commentButton.classList.add('active');
      commentCounter.innerHTML = `<i class='bx bx-comment'></i> Close Comments`;
      loadComments(postId);
    } else {
      commentsSection.style.display = 'none';
      commentButton.classList.remove('active');
      database.ref(`posts/submitted${postId}/comments`).once('value').then(snap => {
        const commentCount = snap.numChildren();
        commentCounter.innerHTML = `<i class='bx bx-comment'></i> ${commentCount} ${commentCount === 1 ? 'Comment' : 'Comments'}`;
      });
    }
  }
}

async function loadComments(postId) {
  const commentsContainer = document.getElementById(`comments-${postId}`);
  if (!commentsContainer) {
    console.error(`[${new Date().toISOString()}] Comments container not found for post: ${postId}`);
    return;
  }

  database.ref(`posts/submitted/${postId}/comments`).orderByChild('timestamp').on('value', async (snapshot) => {
    commentsContainer.innerHTML = '';
    const comments = snapshot.val();
    if (comments) {
      const commentArray = Object.entries(comments).map(([id, comment]) => ({ id, ...comment }));
      const commentTree = buildCommentTree(commentArray);
      renderComments(commentTree, commentsContainer, postId, 0);
    } else {
      commentsContainer.innerHTML = '<p>No comments yet.</p>';
    }
  }, (error) => {
    console.error(`[${new Date().toISOString()}] Error loading comments:`, error);
    commentsContainer.innerHTML = '<p>Error loading comments.</p>';
  });
}

function buildCommentTree(comments) {
  const tree = [];
  const lookup = {};

  comments.forEach(comment => {
    lookup[comment.id] = { ...comment, replies: [] };
  });

  comments.forEach(comment => {
    if (comment.parentCommentId) {
      if (lookup[comment.parentCommentId]) {
        lookup[comment.parentCommentId].replies.push(lookup[comment.id]);
      }
    } else {
      tree.push(lookup[comment.id]);
    }
  });

  tree.sort((a, b) => a.timestamp - b.timestamp);
  Object.values(lookup).forEach(comment => {
    if (comment.replies) {
      comment.replies.sort((a, b) => a.timestamp - b.timestamp);
    }
  });

  return tree;
}

function renderComments(comments, container, postId, level) {
  comments.forEach(({ id: commentId, ...comment }) => {
    const commentElem = document.createElement('div');
    commentElem.className = `comment level-${level}`;
    const canDelete = user && user.uid === comment.userId;
    commentElem.innerHTML = `
      <div class="comment-header">
        <div class="comment-user-info">
          <strong>${comment.userName || 'Anonymous'}</strong>
          <small>${new Date(comment.timestamp).toLocaleDateString()}</small>
        </div>
        ${canDelete ? `<button class="delete-comment" onclick="deleteComment('${postId}', '${commentId}')"><i class='bx bx-trash'></i></button>` : ''}
      </div>
      <p>${comment.text}</p>
      <div class="comment-actions">
        <button class="reply-button" onclick="toggleReplyInput('${postId}', '${commentId}')"><i class='bx bx-reply'></i> Reply</button>
      </div>
      <div class="reply-container" id="reply-container-${commentId}" style="display: none;">
        <div class="reply-input">
          <div class="input-container">
            <textarea id="reply-input-${commentId}" placeholder="Add a reply..."></textarea>
            <button class="send-reply" onclick="addComment('${postId}', '${commentId}')"><i class='bx bx-send'></i></button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(commentElem);
    if (comment.replies && comment.replies.length > 0) {
      const repliesContainer = document.createElement('div');
      repliesContainer.className = 'replies';
      commentElem.appendChild(repliesContainer);
      renderComments(comment.replies, repliesContainer, postId, level + 1);
    }
  });
}

function toggleReplyInput(postId, commentId) {
  const replyContainer = document.getElementById(`reply-container-${commentId}`);
  if (replyContainer) {
    replyContainer.style.display = replyContainer.style.display === 'none' ? 'block' : 'none';
    if (replyContainer.style.display === 'block') {
      const replyInput = document.getElementById(`reply-input-${commentId}`);
      if (replyInput) replyInput.focus();
    }
  }
}

async function validateMediaUrl(url, type) {
  console.log(`[${new Date().toISOString()}] Validating media URL: ${url} (${type})`);
  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (!response.ok) {
      console.warn(`[${new Date().toISOString()}] Media URL inaccessible: ${url}, status: ${response.status} ${response.statusText}`);
      return false;
    }
    const contentType = response.headers.get('content-type');
    if (type === 'image' && !contentType?.startsWith('image/')) {
      console.warn(`[${new Date().toISOString()}] Invalid content type for image: ${contentType}, URL: ${url}`);
      return false;
    }
    if (type === 'video' && !contentType?.startsWith('video/')) {
      console.warn(`[${new Date().toISOString()}] Invalid content type for video: ${contentType}, URL: ${url}`);
      return false;
    }
    console.log(`[${new Date().toISOString()}] Media URL validated successfully: ${url}`);
    return true;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error validating media URL ${url}:`, error.message);
    return false;
  }
}


// Load posts with enhanced rendering
async function loadPosts() {
  console.log(`[${new Date().toISOString()}] Loading posts with filter: ${selectedCategoryFilter}`);
  const postsContainer = document.getElementById('posts');
  if (!postsContainer) {
    console.error(`[${new Date().toISOString()}] Posts container not found`);
    Swal.fire('Error', 'Posts container not found. Please try refreshing the page.', 'error');
    return;
  }

  database.ref('posts/submitted').orderByChild('timestamp').on('value', async (snapshot) => {
    postsContainer.innerHTML = '';
    const posts = snapshot.val();
    if (posts) {
      console.log(`[${new Date().toISOString()}] Posts retrieved: ${Object.keys(posts).length}`);
      let postArray = Object.entries(posts).map(([id, post]) => ({ id, ...post }));
      if (selectedCategoryFilter !== 'all') {
        postArray = postArray.filter(post => post.category === selectedCategoryFilter);
      }
      postArray.sort((a, b) => sortOrder === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);

      for (const { id, ...post } of postArray) {
        const postElem = document.createElement('div');
        postElem.className = 'post';
        postElem.id = `post-${id}`;

        let mediaHtml = '';
        // Handle both mediaUrls (array) and mediaUrl (string)
        if (post.mediaUrls && Array.isArray(post.mediaUrls) && post.mediaUrls.length > 0) {
          // Image posts with mediaUrls array
          mediaHtml = post.mediaUrls.map(url => `
            <img src="${url}" class="post-media" alt="Post media" this.style.display='none'; this.nextElementSibling.style.display='block'">
          `).join('');
        } else if (post.mediaUrl) {
          // Video posts with mediaUrl string
          if (post.mediaType === 'image') {
            mediaHtml = `
              <img src="${post.mediaUrl}" class="post-media" alt="Post media" this.style.display='none'; this.nextElementSibling.style.display='block'">
            `;
          } else if (post.mediaType === 'video') {
            mediaHtml = `
              <video src="${post.mediaUrl}" class="post-media" poster="${post.thumbnailUrl || ''}" controls onerror="console.error('Failed to load video: ${post.mediaUrl}'); this.style.display='none'; this.nextElementSibling.style.display='block'">
            `;
          }
        }

        const canEdit = user && user.uid === post.userId;
        const isShared = post.isShared || false;
        const sharedInfo = isShared ? `<small class="shared-info">Shared from ${post.originalUserName}'s post</small>` : '';
        const contentWrapperStyle = isShared ? `style="border-color: transparent;"` : '';
        const contentHr = isShared ? `<hr>` : '';
        const captionHtml = isShared && post.shareCaption ? `<p class="share-caption">${post.shareCaption}</p>` : '';

        const commentCount = await database.ref(`posts/submitted/${id}/comments`).once('value').then(snap => snap.numChildren());

        postElem.innerHTML = `
          <div class="post-header">
            <div class="post-user-info">
              <strong style="color: #121212">${post.userName}</strong>
              <div class="post-meta">
                <small style="color: var(--primary-color, #14AEBB); font-size: 0.9em;">${post.organization || ''}</small>
                <small>${new Date(post.timestamp).toLocaleString()}</small>
                <small style="color: var(--primary-color); font-size: 0.9em;">${post.category ? post.category.charAt(0).toUpperCase() + post.category.slice(1) : ''}</small>
              </div>
              ${sharedInfo}
              ${captionHtml}
            </div>
            ${canEdit ? `
              <div class="post-menu">
                <button class="menu-button"><i class='bx bx-dots-horizontal-rounded'></i></button>
                <div class="menu-dropdown" style="display: none;">
                  <button onclick="toggleEdit('${id}', '${post.userId}')">Edit</button>
                  <button onclick="deletePost('${id}')">Delete</button>
                </div>
              </div>
            ` : ''}
          </div>
          ${contentHr}
          <div class="post-content-wrapper" ${contentWrapperStyle}>
            ${post.title ? `<h4 class="post-title" contenteditable="false">${post.title}</h4>` : '<h4 class="post-title" contenteditable="false" style="display: none;"></h4>'}
            <p class="post-content" contenteditable="false">${post.content}</p>
            ${mediaHtml}
            <div class="post-actions">
              <div class="comment-counter" onclick="toggleComments('${id}')">
                <i class='bx bx-comment'></i> ${commentCount} ${commentCount === 1 ? 'Comment' : 'Comments'}
              </div>
              <div class="action-buttons">
                <button class="share-button" onclick="sharePost('${id}')"><i class='bx bx-share'></i></button>
                <button class="comment-button" onclick="toggleComments('${id}')"><i class='bx bx-comment'></i></button>
              </div>
            </div>
            <div class="comments-section" id="comments-section-${id}" style="display: none;">
              <hr class="comment-divider">
              <div class="comment-input">
                <div class="input-container">
                  <textarea id="comment-input-${id}" placeholder="Add a comment..."></textarea>
                  <button class="send-button" onclick="addComment('${id}')"><i class='bx bx-send'></i></button>
                </div>
              </div>
              <hr class="comment-divider">
              <div class="comments-list" id="comments-${id}"></div>
            </div>
          </div>
        `;
        postsContainer.appendChild(postElem);

        if (canEdit) {
          const menuButton = postElem.querySelector('.menu-button');
          const menuDropdown = postElem.querySelector('.menu-dropdown');
          menuButton.addEventListener('click', () => {
            menuDropdown.style.display = menuDropdown.style.display === 'block' ? 'none' : 'block';
          });
          document.addEventListener('click', (e) => {
            if (!postElem.contains(e.target)) {
              menuDropdown.style.display = 'none';
            }
          });
        }
      }
    } else {
      postsContainer.innerHTML = '<p>No posts available.</p>';
    }
  }, (error) => {
    console.error(`[${new Date().toISOString()}] Error loading posts:`, error);
    Swal.fire('Error', `Failed to load posts: ${error.message}`, 'error');
    postsContainer.innerHTML = '<p>Error loading posts.</p>';
  });
}

async function sharePost(id) {
  console.log(`[${new Date().toISOString()}] sharePost called for post: ${id}`);
  if (!user) {
    Swal.fire('Please log in to share posts', '', 'warning');
    return;
  }

  const modal = document.getElementById('share-post-modal');
  const shareContent = document.getElementById('share-post-content');
  const shareCaptionInput = document.getElementById('share-caption-input');
  const originalCreator = document.getElementById('share-original-creator');
  if (!modal || !shareContent || !shareCaptionInput || !originalCreator) {
    console.error(`[${new Date().toISOString()}] Share modal elements missing`);
    Swal.fire('Error', 'Share modal elements not found. Please try refreshing the page.', 'error');
    return;
  }

  try {
    const postSnapshot = await database.ref(`posts/submitted/${id}`).once('value');
    const originalPost = postSnapshot.val();
    if (!originalPost) {
      Swal.fire('Error', 'Post not found', 'error');
      return;
    }

    const { contactPerson } = await fetchUserData(user.uid);
    modal.dataset.postId = id;
    originalCreator.textContent = originalPost.userName;
    let mediaHtml = '';
    if (originalPost.mediaUrls && Array.isArray(originalPost.mediaUrls) && originalPost.mediaUrls.length > 0) {
      mediaHtml = originalPost.mediaUrls.map(url => `
        <img src="${url}" class="post-media" alt="Post media" this.style.display='none'; this.nextElementSibling.style.display='block'">
      `).join('');
    } else if (originalPost.mediaUrl) {
      if (originalPost.mediaType === 'image') {
        mediaHtml = `
          <img src="${originalPost.mediaUrl}" class="post-media" alt="Post media" this.style.display='none'; this.nextElementSibling.style.display='block'">
        `;
      } else if (originalPost.mediaType === 'video') {
        mediaHtml = `
          <video src="${originalPost.mediaUrl}" class="post-media" poster="${originalPost.thumbnailUrl || ''}" controls onerror="console.error('Failed to load video: ${originalPost.mediaUrl}'); this.style.display='none'; this.nextElementSibling.style.display='block'">
        `;
      }
    }

    shareContent.innerHTML = `
      ${originalPost.title ? `<h4 class="post-title">${originalPost.title}</h4>` : ''}
      <p class="post-content">${originalPost.content}</p>
      ${mediaHtml}
    `;
    shareCaptionInput.value = '';
    modal.style.display = 'block';
    shareCaptionInput.focus();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error preparing share modal:`, error);
    Swal.fire('Error', 'Failed to load post for sharing.', 'error');
  }
}


async function editMedia(postId, existingMedia, newFiles, newUrls) {
  console.log(`[${new Date().toISOString()}] Editing media for post: ${postId}`);
  const mediaItems = [...(existingMedia || [])];
  const deletedMedia = [];

  // Handle deleted media (move to deleted folder)
  const currentMediaUrls = mediaItems.map(item => item.url);
  const updatedMediaUrls = newUrls.filter(url => url.trim());
  const removedMedia = mediaItems.filter(item => item.filePath && !updatedMediaUrls.includes(item.url));
  for (const item of removedMedia) {
    if (item.filePath) {
      const deletedPath = `deleted/${user.uid}/${item.filePath.split('/').pop()}`;
      console.log(`[${new Date().toISOString()}] Moving media to ${deletedPath}`);
      try {
        await storage.ref(item.filePath).getDownloadURL().then(async (url) => {
          const response = await fetch(url);
          const blob = await response.blob();
          await storage.ref(deletedPath).put(blob, { contentType: item.type === 'image' ? 'image/jpeg' : item.type });
          await storage.ref(item.filePath).delete();
          console.log(`[${new Date().toISOString()}] Media moved to deleted folder: ${item.filePath}`);
        });
        deletedMedia.push(item);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error moving media to deleted folder:`, error);
      }
    }
  }

  // Remove deleted media from mediaItems
  mediaItems.splice(0, mediaItems.length, ...mediaItems.filter(item => !deletedMedia.includes(item)));

  // Process new files
  for (const file of Array.from(newFiles)) {
    if (!['image/jpeg', 'image/png', 'video/mp4', 'video/webm'].includes(file.type)) {
      console.log(`[${new Date().toISOString()}] Invalid file type: ${file.type}`);
      Swal.fire('Unsupported file type', 'Please upload JPEG, PNG, MP4, or WebM files', 'error');
      throw new Error(`Unsupported file type: ${file.type}`);
    }
    if (file.size > 25 * 1024 * 1024) {
      console.log(`[${new Date().toISOString()}] File size exceeds 25MB limit: ${file.size}`);
      Swal.fire('File too large', 'Maximum file size is 25MB', 'error');
      throw new Error('File size exceeds 25MB');
    }

    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    let result;
    try {
      result = await compressMedia(file);
      console.log(`[${new Date().toISOString()}] Compression successful for ${file.name}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Compression failed for ${file.name}:`, error);
      Swal.fire('Error', `Failed to compress ${file.name}: ${error.message}`, 'error');
      throw error;
    }

    if (file.type.startsWith('image/')) {
      const imagePath = `image_posts/${user.uid}/${Date.now()}_${sanitizedFileName}`;
      const url = await uploadMediaToStorage(result.blob, imagePath, result.mimeType);
      mediaItems.push({ url, type: 'image', filePath: imagePath });
      console.log(`[${new Date().toISOString()}] Image uploaded successfully: ${url}`);
    } else if (file.type.startsWith('video/')) {
      const videoPath = `video_posts/${user.uid}/${Date.now()}_${sanitizedFileName}`;
      const videoUrl = await uploadMediaToStorage(result.videoBlob, videoPath, result.mimeType);
      let thumbnailUrl = '';
      if (result.thumbnailBlob) {
        const thumbnailPath = `video_posts/${user.uid}/thumbnails/${Date.now()}_thumbnail.jpg`;
        thumbnailUrl = await uploadMediaToStorage(result.thumbnailBlob, thumbnailPath, 'image/jpeg');
        console.log(`[${new Date().toISOString()}] Thumbnail uploaded successfully: ${thumbnailUrl}`);
      }
      mediaItems.push({ url: videoUrl, type: 'video', thumbnail: thumbnailUrl, filePath: videoPath });
      console.log(`[${new Date().toISOString()}] Video uploaded successfully: ${videoUrl}`);
    }
  }

  // Process new URLs
  for (const url of newUrls) {
    if (!url.match(/^https?:\/\/.*\.(?:png|jpg|jpeg)$/i)) {
      console.log(`[${new Date().toISOString()}] Invalid image URL: ${url}`);
      Swal.fire('Invalid URL', 'Please provide valid image URLs (PNG, JPG, JPEG)', 'warning');
      throw new Error(`Invalid image URL: ${url}`);
    }
    if (!mediaItems.some(item => item.url === url)) {
      mediaItems.push({ url, type: 'image' });
      console.log(`[${new Date().toISOString()}] Added URL to media: ${url}`);
    }
  }

  return mediaItems.length > 0 ? mediaItems : null;
}


// Edit and delete posts
async function toggleEdit(id, postUserId) {
  console.log(`[${new Date().toISOString()}] toggleEdit called for post: ${id}`);
  const postElem = document.getElementById(`post-${id}`);
  if (!postElem) {
    console.error(`[${new Date().toISOString()}] Post element not found: ${id}`);
    Swal.fire('Error', 'Post not found. Please try refreshing the page.', 'error');
    return;
  }

  if (!user || user.uid !== postUserId) {
    console.error(`[${new Date().toISOString()}] Unauthorized edit attempt for post: ${id}, by user: ${user?.uid}`);
    Swal.fire('Error', 'You are not authorized to edit this post.', 'error');
    return;
  }

  const titleElem = postElem.querySelector('.post-title');
  const contentElem = postElem.querySelector('.post-content');
  const menuDropdown = postElem.querySelector('.menu-dropdown');
  const mediaContainer = postElem.querySelector('.post-content-wrapper');
  if (!titleElem || !contentElem || !menuDropdown || !mediaContainer) {
    console.error(`[${new Date().toISOString()}] Post title, content, menu dropdown, or media container not found for post: ${id}`);
    Swal.fire('Error', 'Post elements not found. Please try refreshing the page.', 'error');
    return;
  }

  if (contentElem.getAttribute('contenteditable') === 'true') {
    // Save changes
    titleElem.setAttribute('contenteditable', 'false');
    contentElem.setAttribute('contenteditable', 'false');
    if (!titleElem.textContent.trim()) titleElem.style.display = 'none';

    const mediaInput = document.createElement('input');
    mediaInput.type = 'file';
    mediaInput.accept = 'image/jpeg,image/png,video/mp4,video/webm';
    mediaInput.multiple = true;
    mediaInput.style.display = 'none';
    mediaContainer.appendChild(mediaInput);

    const webUrlInput = document.createElement('textarea');
    webUrlInput.placeholder = 'Enter image URLs (one per line)';
    webUrlInput.style.display = 'none';
    mediaContainer.appendChild(webUrlInput);

    const mediaPreview = document.createElement('div');
    mediaPreview.id = `edit-media-preview-${id}`;
    mediaContainer.appendChild(mediaPreview);

    try {
      const postSnapshot = await database.ref(`posts/submitted/${id}`).once('value');
      const post = postSnapshot.val();
      if (!post) throw new Error('Post not found');

      const newFiles = mediaInput.files;
      const newUrls = webUrlInput.value.trim().split('\n').filter(url => url.trim());
      const updatedMedia = await editMedia(id, post.media, newFiles, newUrls);

      await database.ref(`posts/submitted/${id}`).update({
        title: titleElem.textContent.trim(),
        content: contentElem.textContent.trim(),
        media: updatedMedia,
        editedTimestamp: firebase.database.ServerValue.TIMESTAMP
      });

      const { contactPerson, organization } = await fetchUserData(user.uid);
      await logActivity(`${contactPerson}${organization ? ` from ${organization}` : ''} edited a post`);
      console.log(`[${new Date().toISOString()}] Post updated successfully: ${id}`);
      Swal.fire('Success', 'Post updated successfully!', 'success');

      // Clean up temporary elements
      mediaInput.remove();
      webUrlInput.remove();
      mediaPreview.remove();
      menuDropdown.querySelector('button[onclick*="toggleEdit"]').textContent = 'Edit';
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error updating post:`, error);
      Swal.fire('Error', `Failed to update post: ${error.message}`, 'error');
    }
  } else {
    // Enter edit mode
    titleElem.setAttribute('contenteditable', 'true');
    titleElem.style.display = 'block';
    contentElem.setAttribute('contenteditable', 'true');
    contentElem.focus();

    const mediaInput = document.createElement('input');
    mediaInput.type = 'file';
    mediaInput.accept = 'image/jpeg,image/png,video/mp4,video/webm';
    mediaInput.multiple = true;
    mediaContainer.appendChild(mediaInput);

    const webUrlInput = document.createElement('textarea');
    webUrlInput.placeholder = 'Enter image URLs (one per line)';
    webUrlInput.style.marginTop = '10px';
    mediaContainer.appendChild(webUrlInput);

    const mediaPreview = document.createElement('div');
    mediaPreview.id = `edit-media-preview-${id}`;
    mediaContainer.appendChild(mediaPreview);

    const postSnapshot = await database.ref(`posts/submitted/${id}`).once('value');
    const post = postSnapshot.val();
    if (post.media) {
      displayImages(post.media.filter(item => item.type === 'image'), `edit-media-preview-${id}`);
    }

    mediaInput.addEventListener('change', () => {
      removePreviewItem(0, 'file', mediaInput, webUrlInput, mediaPreview, null, null);
    });

    webUrlInput.addEventListener('input', () => {
      removePreviewItem(0, 'url', mediaInput, webUrlInput, mediaPreview, null, null);
    });

    menuDropdown.querySelector('button[onclick*="toggleEdit"]').textContent = 'Save';
  }
}

async function deletePost(id) {
  console.log(`[${new Date().toISOString()}] deletePost called for post: ${id}`);
  const postRef = database.ref(`posts/submitted/${id}`);
  const post = (await postRef.once('value')).val();
  if (!user || user.uid !== post.userId) {
    console.error(`[${new Date().toISOString()}] Unauthorized delete attempt for post: ${id}, by user: ${user?.uid}`);
    Swal.fire('Error', 'You are not authorized to delete this post.', 'error');
    return;
  }

  Swal.fire({
    title: 'Delete Post',
    text: 'Are you sure you want to delete this post? It will be moved to a deleted posts archive.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'No'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        console.log(`[${new Date().toISOString()}] Moving post ${id} to posts/deleted/${user.uid}`);
        // Move associated media to deleted folder
        if (post.media && Array.isArray(post.media)) {
          for (const item of post.media) {
            if (item.filePath) {
              const deletedPath = `deleted/${user.uid}/${item.filePath.split('/').pop()}`;
              console.log(`[${new Date().toISOString()}] Moving media to ${deletedPath}`);
              try {
                const url = await storage.ref(item.filePath).getDownloadURL();
                const response = await fetch(url);
                const blob = await response.blob();
                await storage.ref(deletedPath).put(blob, { contentType: item.type === 'image' ? 'image/jpeg' : item.type });
                await storage.ref(item.filePath).delete();
                console.log(`[${new Date().toISOString()}] Media moved to deleted folder: ${item.filePath}`);
              } catch (error) {
                console.error(`[${new Date().toISOString()}] Error moving media to deleted folder:`, error);
              }
            }
          }
        }

        // Move post to deleted folder
        await database.ref(`posts/deleted/${user.uid}/${id}`).set({
          ...post,
          deletedTimestamp: firebase.database.ServerValue.TIMESTAMP
        });
        await postRef.remove();
        const { contactPerson, organization } = await fetchUserData(user.uid);
        await logActivity(`${contactPerson}${organization ? ` from ${organization}` : ''} deleted a post (moved to archive)`);
        console.log(`[${new Date().toISOString()}] Post deleted successfully: ${id}`);
        Swal.fire('Success', 'Post moved to archive successfully!', 'success');
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error deleting post:`, error);
        Swal.fire('Error', `Failed to delete post: ${error.message}`, 'error');
      }
    }
  });
}

async function logActivity(message) {
  console.log(`[${new Date().toISOString()}] Logging activity: ${message}`);
  if (!user) {
    console.error(`[${new Date().toISOString()}] No user logged in, cannot log activity`);
    return;
  }
  try {
    await database.ref(`activity_log/${user.uid}`).push({
      message: message,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error logging activity:`, error);
  }
}

async function loadActivityLog() {
  console.log(`[${new Date().toISOString()}] Loading activity log`);
  const log = document.getElementById('activity-log');
  if (!log) {
    console.error(`[${new Date().toISOString()}] Activity log container not found`);
    return;
  }
  if (!user) {
    console.error(`[${new Date().toISOString()}] No user logged in, cannot load activity log`);
    log.innerHTML = '<p>Please log in to view your activity.</p>';
    return;
  }

  database.ref(`activity_log/${user.uid}`).orderByChild('timestamp').limitToLast(50).on('value', (snapshot) => {
    log.innerHTML = '';
    const activities = snapshot.val();
    if (activities) {
      const activityArray = Object.entries(activities).map(([id, activity]) => ({ id, ...activity }));
      activityArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      for (const activity of activityArray) {
        const item = document.createElement('li');
        item.textContent = `${new Date(activity.timestamp).toLocaleTimeString()}: ${activity.message}`;
        log.appendChild(item);
      }
    } else {
      log.innerHTML = '<p>No activity available.</p>';
    }
  }, (error) => {
    console.error(`[${new Date().toISOString()}] Error loading activity log:`, error);
    log.innerHTML = '<p>Error loading activity.</p>';
  });
}

function removePreviewItem(index, type, mediaInput, webUrlInput, mediaPreview, tapToUploadButton, mediaCaption) {
  console.log(`[${new Date().toISOString()}] Removing preview item: ${type} at index ${index}`);
  if (type === 'file') {
    const files = Array.from(mediaInput.files);
    files.splice(index, 1);
    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));
    mediaInput.files = dataTransfer.files;
  } else if (type === 'url') {
    const urls = webUrlInput.value.trim().split('\n').filter(url => url.trim());
    urls.splice(index, 1);
    webUrlInput.value = urls.join('\n');
  }

  mediaPreview.innerHTML = '';
  const currentFiles = Array.from(mediaInput.files);
  const currentUrls = webUrlInput.value.trim().split('\n').filter(url => url.trim());
  const mediaButtons = document.querySelector('.media-buttons');

  currentFiles.forEach((file, i) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'preview-item';
    const media = file.type.startsWith('image/') ? document.createElement('img') : document.createElement('video');
    media.src = URL.createObjectURL(file);
    media.className = 'media-preview';
    if (file.type.startsWith('video/')) {
      media.controls = true;
      media.id = `preview-video-${i}`;
      let retries = 0;
      const maxRetries = 3;
      const attemptPlay = () => {
        media.play().catch((error) => {
          console.error(`[${new Date().toISOString()}] Video preview playback failed for file ${file.name}, attempt ${retries + 1}:`, error);
          if (retries < maxRetries) {
            retries++;
            console.log(`[${new Date().toISOString()}] Retrying video preview playback for file ${file.name}, attempt ${retries}`);
            setTimeout(attemptPlay, 1000 * retries);
          } else {
            console.error(`[${new Date().toISOString()}] Max retries reached for video preview ${file.name}`);
            const errorDiv = document.createElement('div');
            errorDiv.style.color = 'red';
            errorDiv.style.textAlign = 'center';
            errorDiv.style.fontSize = '14px';
            errorDiv.textContent = `Failed to load video preview`;
            itemDiv.appendChild(errorDiv);
          }
        });
      };
      media.addEventListener('loadeddata', () => {
        console.log(`[${new Date().toISOString()}] Video preview loaded successfully for file ${file.name}`);
        retries = 0;
      });
      attemptPlay();
    }
    const dimensionsDiv = document.createElement('div');
    dimensionsDiv.className = 'media-dimensions';
    if (file.type.startsWith('image/')) {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        dimensionsDiv.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
      };
      img.onerror = () => {
        dimensionsDiv.textContent = 'Error loading dimensions';
      };
    } else {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        dimensionsDiv.textContent = `${video.videoWidth} × ${video.videoHeight}`;
      };
      video.onerror = () => {
        dimensionsDiv.textContent = 'Error loading dimensions';
      };
    }
    const deleteBtn = document.createElement('span');
    deleteBtn.className = 'delete-preview';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = () => removePreviewItem(i, 'file', mediaInput, webUrlInput, mediaPreview, tapToUploadButton, mediaCaption);
    itemDiv.appendChild(media);
    itemDiv.appendChild(dimensionsDiv);
    itemDiv.appendChild(deleteBtn);
    mediaPreview.appendChild(itemDiv);
  });

  currentUrls.forEach((url, i) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'preview-item';
    const img = document.createElement('img');
    img.src = url;
    img.className = 'media-preview';
    const dimensionsDiv = document.createElement('div');
    dimensionsDiv.className = 'media-dimensions';
    const imgForDimensions = new Image();
    imgForDimensions.src = url;
    imgForDimensions.onload = () => {
      dimensionsDiv.textContent = `${imgForDimensions.naturalWidth} × ${imgForDimensions.naturalHeight}`;
    };
    imgForDimensions.onerror = () => {
      dimensionsDiv.textContent = 'Error loading dimensions';
    };
    const deleteBtn = document.createElement('span');
    deleteBtn.className = 'delete-preview';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = () => removePreviewItem(i, 'url', mediaInput, webUrlInput, mediaPreview, tapToUploadButton, mediaCaption);
    itemDiv.appendChild(img);
    itemDiv.appendChild(dimensionsDiv);
    itemDiv.appendChild(deleteBtn);
    mediaPreview.appendChild(itemDiv);
  });

  tapToUploadButton.innerHTML = currentFiles.length ? `
    <span>Image/Video Selected</span>
  ` : `
    <i class='bx bx-image-add' style="margin-right: 6px; font-size: 30px;"></i>
    <span>Tap to Upload</span>
  `;
  tapToUploadButton.classList.toggle('image-selected', currentFiles.length > 0);
  mediaCaption.style.display = currentFiles.length || currentUrls.length ? 'none' : 'block';
  mediaButtons.style.display = currentFiles.length || currentUrls.length ? 'none' : 'flex';
}

function setupModal() {
  const modal = document.getElementById('post-modal');
  if (!modal) {
    console.error(`[${new Date().toISOString()}] Post modal not found`);
    Swal.fire('Error', 'Post modal not found. Please reload the page.', 'error');
    return;
  }

  const postCloseButton = document.getElementById('post-modal-close');
  const postButtons = document.querySelectorAll('.post-option');
  const modalPostContent = document.getElementById('modal-post-content');
  const modalPostCategory = document.getElementById('modal-post-category');
  const mediaInput = document.getElementById('modal-media-upload');
  const webUrlInput = document.getElementById('modal-web-url-input');
  const mediaPreview = document.getElementById('modal-media-preview');
  const tapToUploadButton = document.getElementById('tap-to-upload');
  const addWebUrlButton = document.getElementById('add-web-url');
  const mediaCaption = document.getElementById('media-caption');
  const mediaButtons = document.querySelector('.media-buttons');
  const shareModal = document.getElementById('share-post-modal');
  const shareCloseButton = document.getElementById('share-modal-close');
  const shareCancelButton = document.getElementById('share-cancel-button');
  const shareSubmitButton = document.getElementById('share-submit-button');
  const sortButton = document.getElementById('sort-posts-button');
  const categoryFilter = document.getElementById('category-filter');

  if (!postCloseButton || !modalPostContent || !modalPostCategory || !mediaInput || !webUrlInput || !mediaPreview || !tapToUploadButton || !addWebUrlButton || !mediaCaption || !mediaButtons || !shareModal || !shareCloseButton || !shareCancelButton || !shareSubmitButton || !sortButton || !categoryFilter) {
    console.error(`[${new Date().toISOString()}] Missing modal elements`);
    Swal.fire('Error', 'Some modal elements are missing. Please reload the page.', 'error');
    return;
  }

  const urlError = document.createElement('p');
  urlError.id = 'url-error';
  urlError.style.color = '#d33';
  urlError.style.fontSize = '0.9em';
  urlError.style.marginTop = '5px';
  webUrlInput.insertAdjacentElement('afterend', urlError);

  const insertUrlButton = document.createElement('button');
  insertUrlButton.id = 'insert-web-url';
  insertUrlButton.textContent = 'Insert';
  insertUrlButton.style.display = 'none';
  insertUrlButton.style.padding = '8px';
  insertUrlButton.style.borderRadius = '4px';
  insertUrlButton.style.backgroundColor = 'var(--primary-color, #14AEBB)';
  insertUrlButton.style.color = '#fff';
  insertUrlButton.style.border = 'none';
  insertUrlButton.style.cursor = 'pointer';
  insertUrlButton.style.marginTop = '5px';
  webUrlInput.insertAdjacentElement('afterend', insertUrlButton);

  function resizeTextarea() {
    modalPostContent.style.height = 'auto';
    const newHeight = Math.max(modalPostContent.scrollHeight, 80);
    modalPostContent.style.height = `${newHeight}px`;
  }

  modalPostContent.addEventListener('input', resizeTextarea);

  postButtons.forEach(button => {
    button.addEventListener('click', () => {
      const type = button.dataset.type;
      console.log(`[${new Date().toISOString()}] Post option clicked: ${type}`);
      postButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      if (type === 'text') {
        mediaInput.style.display = 'none';
        webUrlInput.style.display = 'none';
        insertUrlButton.style.display = 'none';
        mediaButtons.style.display = 'none'; // Hide media-buttons for text
        mediaPreview.innerHTML = '';
        mediaInput.value = '';
        webUrlInput.value = '';
        mediaCaption.style.display = 'block';
        tapToUploadButton.innerHTML = `
          <i class='bx bx-image-add' style="margin-right: 6px; font-size: 30px;"></i>
          <span>Tap to Upload</span>
        `;
        tapToUploadButton.classList.remove('image-selected');
      } else if (type === 'image' || type === 'video') {
        mediaInput.style.display = 'none';
        webUrlInput.style.display = 'none';
        insertUrlButton.style.display = 'none';
        mediaButtons.style.display = 'flex';
        mediaCaption.style.display = 'block';
        tapToUploadButton.click();
      } else if (type === 'link') {
        mediaInput.style.display = 'none';
        webUrlInput.style.display = 'block';
        insertUrlButton.style.display = 'block';
        mediaButtons.style.display = 'none';
        mediaCaption.style.display = 'block';
        webUrlInput.focus();
      }
    });
  });

  tapToUploadButton.addEventListener('click', () => {
    console.log(`[${new Date().toISOString()}] Tap to upload clicked`);
    mediaInput.click();
  });

  mediaInput.addEventListener('change', () => {
    console.log(`[${new Date().toISOString()}] Media files selected: ${mediaInput.files.length}`);
    removePreviewItem(0, 'url', mediaInput, webUrlInput, mediaPreview, tapToUploadButton, mediaCaption);
  });

  addWebUrlButton.addEventListener('click', () => {
    console.log(`[${new Date().toISOString()}] Add web URL clicked`);
    webUrlInput.style.display = 'block';
    insertUrlButton.style.display = 'block';
    mediaButtons.style.display = 'none';
    webUrlInput.focus();
  });

  insertUrlButton.addEventListener('click', () => {
    console.log(`[${new Date().toISOString()}] Insert web URL clicked`);
    const urls = webUrlInput.value.trim().split('\n').filter(url => url.trim());
    if (urls.length > 30) {
      urlError.textContent = 'You can add up to 30 URLs';
      console.log(`[${new Date().toISOString()}] Too many URLs: ${urls.length}`);
      return;
    }

    const invalidUrls = urls.filter(url => !url.match(/^https?:\/\/.*\.(?:png|jpg|jpeg)$/i));
    if (invalidUrls.length > 0) {
      urlError.textContent = 'Please provide valid image URLs (PNG, JPG, JPEG)';
      console.log(`[${new Date().toISOString()}] Invalid URLs detected: ${invalidUrls.join(', ')}`);
      return;
    }

    urlError.textContent = '';
    removePreviewItem(0, 'url', mediaInput, webUrlInput, mediaPreview, tapToUploadButton, mediaCaption);
  });

  postCloseButton.addEventListener('click', () => {
    console.log(`[${new Date().toISOString()}] Post modal closed`);
    modal.style.display = 'none';
    modalPostContent.value = '';
    modalPostTitle.value = '';
    modalPostCategory.value = '';
    mediaInput.value = '';
    webUrlInput.value = '';
    mediaPreview.innerHTML = '';
    modalPostContent.style.height = '80px';
    mediaButtons.style.display = 'flex';
    webUrlInput.style.display = 'none';
    insertUrlButton.style.display = 'none';
    urlError.textContent = '';
    mediaCaption.style.display = 'block';
    tapToUploadButton.innerHTML = `
      <i class='bx bx-image-add' style="margin-right: 6px; font-size: 30px;"></i>
      <span>Tap to Upload</span>
    `;
    tapToUploadButton.classList.remove('image-selected');
    postButtons.forEach(btn => btn.classList.remove('active'));
    postButtons[0].classList.add('active');
  });

  document.querySelectorAll('.post-creator .post-option').forEach(button => {
    button.addEventListener('click', () => {
      console.log(`[${new Date().toISOString()}] Creator post option clicked: ${button.dataset.type}`);
      if (!user) {
        Swal.fire('Please log in to create a post', '', 'warning');
        return;
      }
      modal.style.display = 'block';
      postButtons.forEach(btn => btn.classList.remove('active'));
      const modalButton = modal.querySelector(`.post-option[data-type="${button.dataset.type}"]`);
      if (modalButton) modalButton.classList.add('active');
      if (button.dataset.type === 'text') {
        mediaButtons.style.display = 'none'; // Hide media-buttons for text
      } else if (button.dataset.type === 'link') {
        webUrlInput.style.display = 'block';
        insertUrlButton.style.display = 'block';
        mediaButtons.style.display = 'none';
        webUrlInput.focus();
      } else if (button.dataset.type === 'image' || button.dataset.type === 'video') {
        mediaInput.click();
      }
    });
  });

  document.getElementById('modal-post-button').addEventListener('click', createPost);

  shareCloseButton.addEventListener('click', () => {
    console.log(`[${new Date().toISOString()}] Share modal closed`);
    shareModal.style.display = 'none';
    shareCaptionInput.value = '';
    document.getElementById('share-modal-post-category').value = '';
    delete shareModal.dataset.postId;
  });

  shareCancelButton.addEventListener('click', () => {
    console.log(`[${new Date().toISOString()}] Share modal cancelled`);
    shareModal.style.display = 'none';
    shareCaptionInput.value = '';
    document.getElementById('share-modal-post-category').value = '';
    delete shareModal.dataset.postId;
  });

  shareSubmitButton.addEventListener('click', submitSharePost);

  sortButton.addEventListener('click', () => {
    sortOrder = sortOrder === 'newest' ? 'oldest' : 'newest';
    sortButton.innerHTML = `<i class='bx bx-sort-${sortOrder === 'newest' ? 'up' : 'down'}'></i> Sort Posts`;
    console.log(`[${new Date().toISOString()}] Sort order changed to: ${sortOrder}`);
    loadPosts();
  });

  categoryFilter.addEventListener('change', () => {
    selectedCategoryFilter = categoryFilter.value;
    console.log(`[${new Date().toISOString()}] Category filter changed to: ${selectedCategoryFilter}`);
    loadPosts();
  });

  // Handle modal click outside
  document.addEventListener('click', (e) => {
    if (e.target === modal) {
      postCloseButton.click();
    } else if (e.target === shareModal) {
      shareCloseButton.click();
    }
  });

  // Video preview retry logic
  mediaInput.addEventListener('change', () => {
    const files = Array.from(mediaInput.files);
    files.forEach((file, index) => {
      if (file.type.startsWith('video/')) {
        const videoPreview = document.querySelector(`#preview-video-${index}`);
        if (videoPreview) {
          let retries = 0;
          const maxRetries = 3;
          const attemptPlay = () => {
            videoPreview.play().catch((error) => {
              console.error(`[${new Date().toISOString()}] Video preview playback failed for ${file.name}, attempt ${retries + 1}:`, error);
              if (retries < maxRetries) {
                retries++;
                console.log(`[${new Date().toISOString()}] Retrying video preview playback for ${file.name}, attempt ${retries}`);
                setTimeout(attemptPlay, 1000 * retries);
              } else {
                console.error(`[${new Date().toISOString()}] Max retries reached for video preview ${file.name}`);
                const errorDiv = videoPreview.nextElementSibling;
                if (errorDiv) {
                  errorDiv.style.display = 'block';
                  videoPreview.style.display = 'none';
                }
              }
            });
          };
          videoPreview.addEventListener('loadeddata', () => {
            console.log(`[${new Date().toISOString()}] Video preview loaded successfully for ${file.name}`);
            retries = 0;
          });
          attemptPlay();
        } else {
          console.error(`[${new Date().toISOString()}] Video preview element not found for index ${index}`);
        }
      }
    });
  });

  // Initialize modal on page load
  resizeTextarea();
  console.log(`[${new Date().toISOString()}] Modal setup completed`);
}

// Call setupModal on page load
document.addEventListener('DOMContentLoaded', setupModal);

// Ensure Firebase listeners are detached on page unload
window.addEventListener('unload', () => {
  console.log(`[${new Date().toISOString()}] Detaching Firebase listeners`);
  database.ref('posts').off();
  if (user) {
    database.ref(`activity_log/${user.uid}`).off();
    document.querySelectorAll('.post').forEach(post => {
      const postId = post.id.replace('post-', '');
      database.ref(`posts/submitted/${postId}/comments`).off();
    });
  }
});
