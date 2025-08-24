// Firebase configuration (unchanged)
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

// Firebase initialization
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

// Inactivity detection (unchanged)
let inactivityTimeout;
const INACTIVITY_TIME = 1800000;

function resetInactivityTimer() {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(checkInactivity, INACTIVITY_TIME);
    console.log("Inactivity timer reset.");
}

function checkInactivity() {
    Swal.fire({
        title: 'Are you still there?',
        text: 'You\'ve been inactive for a while. Do you want to continue your session or log out?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Stay Login',
        cancelButtonText: 'Log Out',
        allowOutsideClick: false,
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            resetInactivityTimer();
            console.log("User chose to continue session.");
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            auth.signOut().then(() => {
                console.log("User logged out due to inactivity.");
                window.location.href = "../pages/login.html";
            }).catch((error) => {
                console.error("Error logging out:", error);
                Swal.fire('Error', 'Failed to log out. Please try again.', 'error');
            });
        }
    });
}

['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
    document.addEventListener(eventType, resetInactivityTimer);
});

// Compress media (unchanged)
async function compressMedia(file) {
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

        canvas.toBlob((blob) => {
          if (!blob) {
            console.error(`[${new Date().toISOString()}] Image compression failed: No blob generated`);
            reject(new Error('Image compression failed'));
            return;
          }
          console.log(`[${new Date().toISOString()}] Image compressed: ${file.size} bytes -> ${blob.size} bytes`);
          resolve({ blob, mimeType: 'image/jpeg' });
        }, 'image/jpeg', 0.5);
      };
      img.onerror = (error) => {
        console.error(`[${new Date().toISOString()}] Image compression failed:`, error);
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
        video.currentTime = 1;

        const generateThumbnail = () => {
          ctx.drawImage(video, 0, 0, width, height);
          canvas.toBlob((thumbnailBlob) => {
            if (!thumbnailBlob) {
              console.error(`[${new Date().toISOString()}] Video thumbnail generation failed: No blob generated`);
              reject(new Error('Thumbnail generation failed'));
              return;
            }
            console.log(`[${new Date().toISOString()}] Video thumbnail generated: ${thumbnailBlob.size} bytes`);
            resolve({ videoBlob: file, thumbnailBlob, mimeType: file.type });
          }, 'image/jpeg', 0.5);
        };

        video.onseeked = generateThumbnail;
        video.onerror = (error) => {
          console.error(`[${new Date().toISOString()}] Video processing failed:`, error);
          reject(error);
        };

        video.play().catch(() => {
          video.currentTime = 1;
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

// Upload media to Storage (unchanged)
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

// Fetch user data (unchanged)
async function fetchUserData(uid) {
  if (userOrgCache.has(uid)) {
    console.log(`[${new Date().toISOString()}] Using cached user data for user: ${uid}`);
    return userOrgCache.get(uid);
  }

  try {
    console.log(`[${new Date().toISOString()}] Fetching user data for user: ${uid}`);
    const snapshot = await database.ref(`users/${uid}`).once('value');
    const userData = snapshot.val() || {};
    const data = {
      contactPerson: userData.contactPerson || userData.displayName || 'Anonymous',
      organization: userData.organization || ''
    };
    userOrgCache.set(uid, data);
    console.log(`[${new Date().toISOString()}] User data fetched:`, data);
    return data;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching user data:`, error);
    return { contactPerson: 'Anonymous', organization: '' };
  }
}

// List all images from Firebase Storage for the current user
async function listUserImages() {
  if (!user) {
    console.error(`[${new Date().toISOString()}] No user logged in`);
    Swal.fire('Please log in to view images', '', 'warning');
    return [];
  }

  try {
    console.log(`[${new Date().toISOString()}] Listing images for user: ${user.uid}`);
    const storageRef = storage.ref(`image_posts/${user.uid}`);
    const listResult = await storageRef.listAll();
    const imageUrls = await Promise.all(
      listResult.items.map(async (itemRef) => {
        try {
          const url = await itemRef.getDownloadURL();
          console.log(`[${new Date().toISOString()}] Image URL retrieved: ${url}`);
          return { name: itemRef.name, url };
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error getting URL for ${itemRef.name}:`, error);
          return null;
        }
      })
    );
    return imageUrls.filter(item => item !== null);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error listing images:`, error);
    Swal.fire('Error', `Failed to list images: ${error.message}`, 'error');
    return [];
  }
}

// Display images in a gallery container
function displayImages(imageUrls, containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`[${new Date().toISOString()}] Image container not found: ${containerId}`);
    Swal.fire('Error', 'Image container not found.', 'error');
    return;
  }

  container.innerHTML = '';
  if (imageUrls.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #666;">No images found in gallery.</p>';
    return;
  }

  imageUrls.forEach(({ name, url }) => {
    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'image-wrapper';
    imgWrapper.innerHTML = `
      <img src="${url}" class="storage-image" alt="${name}" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
      <div style="display:none;color:red;text-align:center;font-size:14px;">Failed to load image: ${name}</div>
      <p style="text-align:center;font-size:12px;color:#333;">${name}</p>
    `;
    container.appendChild(imgWrapper);
  });
}

// Debug function to log Storage contents
async function debugStorageImages() {
  if (!user) {
    console.error(`[${new Date().toISOString()}] No user logged in for debug`);
    return;
  }
  try {
    const storageRef = storage.ref(`image_posts/${user.uid}`);
    const listResult = await storageRef.listAll();
    console.log(`[${new Date().toISOString()}] Storage images for user ${user.uid}:`, listResult.items.map(item => item.fullPath));
    const urls = await Promise.all(listResult.items.map(item => item.getDownloadURL().catch(() => null)));
    console.log(`[${new Date().toISOString()}] Accessible image URLs:`, urls.filter(url => url));
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Debug storage error:`, error);
  }
}

// Auth state listener (unchanged)
auth.onAuthStateChanged(async (currentUser) => {
    user = currentUser;
    console.log(`[${new Date().toISOString()}] Auth state changed:`, currentUser ? { uid: currentUser.uid, displayName: currentUser.displayName } : 'No user');

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
            debugStorageImages(); // Debug Storage contents on login
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

// Update modal user info (unchanged)
function updateModalUserInfo(userData) {
  const userName = document.getElementById('modal-user-name');
  const userOrg = document.getElementById('modal-user-org');
  const shareUserName = document.getElementById('share-modal-user-name');
  if (userName && userOrg) {
    userName.textContent = userData.contactPerson || userData.firstName;
    userOrg.textContent = userData.organization;
  }
  if (shareUserName) {
    shareUserName.textContent = userData.contactPerson;
  }
}

// Create post (updated)
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
  const files = mediaInput.files;

  // Validate that category is selected and either content or media is provided
  if (!category) {
    console.log(`[${new Date().toISOString()}] No category selected`);
    Swal.fire('Please select a category', '', 'warning');
    return;
  }
  if (!content && !files.length) {
    console.log(`[${new Date().toISOString()}] No content or media provided`);
    Swal.fire('Missing Field', 'Please add content or media to post', 'warning');
    return;
  }

  console.log(`[${new Date().toISOString()}] Posting with title: ${title}, content: ${content}, category: ${category}, files: ${files.length}`);
  postButton.classList.add('loading');
  modal.classList.add('disabled');

  try {
    let mediaUrl = '';
    let mediaUrls = [];
    let mediaType = '';
    let thumbnailUrl = '';
    if (files.length) {
      for (const file of files) {
        if (!['image/jpeg', 'image/png', 'video/mp4', 'video/webm'].includes(file.type)) {
          console.log(`[${new Date().toISOString()}] Invalid file type: ${file.type}`);
          Swal.fire('Unsupported file type', 'Please upload JPEG, PNG, MP4, or WebM files', 'error');
          mediaInput.value = null;
          mediaPreview.innerHTML = '';
          throw new Error('Unsupported file type');
        }

        if (file.size > 25 * 1024 * 1024) {
          console.log(`[${new Date().toISOString()}] File size exceeds 25MB limit`);
          Swal.fire('File too large', 'Maximum file size is 25MB', 'error');
          mediaInput.value = null;
          mediaPreview.innerHTML = '';
          throw new Error('File size exceeds 25MB');
        }

        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        let result;
        try {
          result = await compressMedia(file);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error compressing media:`, error);
          Swal.fire('Error', 'Failed to process media.', 'error');
          throw error;
        }

        if (file.type.startsWith('image/')) {
          mediaType = 'image';
          const imagePath = `image_posts/${user.uid}/${Date.now()}_${sanitizedFileName}`;
          const url = await uploadMediaToStorage(result.blob, imagePath, result.mimeType);
          if (!mediaUrl) mediaUrl = url; // Set first image as primary mediaUrl
          mediaUrls.push(url);
          console.log(`[${new Date().toISOString()}] Image uploaded successfully: ${url}`);
        } else if (file.type.startsWith('video/')) {
          mediaType = 'video';
          const videoPath = `video_posts/${user.uid}/${Date.now()}_${sanitizedFileName}`;
          mediaUrl = await uploadMediaToStorage(result.videoBlob, videoPath, result.mimeType);
          console.log(`[${new Date().toISOString()}] Video uploaded successfully: ${mediaUrl}`);

          if (result.thumbnailBlob) {
            const thumbnailPath = `video_posts/${user.uid}/thumbnails/${Date.now()}_thumbnail.jpg`;
            thumbnailUrl = await uploadMediaToStorage(result.thumbnailBlob, thumbnailPath, 'image/jpeg');
            console.log(`[${new Date().toISOString()}] Thumbnail uploaded successfully: ${thumbnailUrl}`);
          }
        }
      }
    }

    const { contactPerson, organization } = await fetchUserData(user.uid);
    const post = {
      title: title || '',
      content: content,
      userId: user.uid,
      userName: contactPerson,
      organization: organization,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      mediaUrl: mediaUrl || '',
      mediaType: mediaType || '',
      thumbnailUrl: thumbnailUrl || '',
      category: category
    };

    // Only include mediaUrls if it contains valid URLs
    if (mediaUrls.length > 0) {
      post.mediaUrls = mediaUrls;
    }

    console.log(`[${new Date().toISOString()}] Writing post to database:`, { ...post, mediaUrl: mediaUrl ? `${mediaUrl.slice(0, 50)}...` : '' });
    await database.ref('posts').push(post);
    await logActivity(`${contactPerson}${organization ? ` from ${organization}` : ''} created a new post in ${category}`);
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

// Share post (unchanged)
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
    const postSnapshot = await database.ref(`posts/${id}`).once('value');
    const originalPost = postSnapshot.val();
    if (!originalPost) {
      Swal.fire('Error', 'Post not found', 'error');
      return;
    }

    const { contactPerson } = await fetchUserData(user.uid);
    modal.dataset.postId = id;
    originalCreator.textContent = originalPost.userName;
    let mediaHtml = '';
    if (originalPost.mediaUrl) {
      if (originalPost.mediaType === 'image') {
        mediaHtml = `<img src="${originalPost.mediaUrl}" class="post-media" alt="Post media" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><div style="display:none;color:red;text-align:center;font-size:14px;">Failed to load image.</div>`;
      } else if (originalPost.mediaType === 'video') {
        mediaHtml = `<video src="${originalPost.mediaUrl}" class="post-media" poster="${originalPost.thumbnailUrl || ''}" controls onerror="this.nextElementSibling.style.display='block';this.style.display='none'"></video><div style="display:none;color:red;text-align:center;font-size:14px;">Failed to load video.</div>`;
      }
    }
    if (originalPost.mediaUrls && Array.isArray(originalPost.mediaUrls)) {
      mediaHtml += originalPost.mediaUrls.map((url, index) =>(`
        <img src="${url}" class="post-media" alt="Post media ${index}" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><div style="display:none;color:red;text-align:center;font-size:14px;">Failed to load image ${index}.</div>
      `)).join('');
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

// Submit shared post (unchanged)
async function submitSharePost() {
  console.log(`[${new Date().toISOString()}] submitSharePost called`);
  if (!user) {
    Swal.fire('Please log in to share posts', '', 'warning');
    return;
  }

  const modal = document.getElementById('share-post-modal');
  const shareCaptionInput = document.getElementById('share-caption-input');
  if (!modal || !shareCaptionInput) {
    console.error(`[${new Date().toISOString()}] Share modal elements missing`);
    Swal.fire('Error', 'Share modal elements not found.', 'error');
    return;
  }

  const postId = modal.dataset.postId;
  if (!postId) {
    console.error(`[${new Date().toISOString()}] Post ID not set in share modal`);
    Swal.fire('Error', 'Invalid post ID.', 'error');
    return;
  }

  const caption = shareCaptionInput.value.trim();
  try {
    const postSnapshot = await database.ref(`posts/${postId}`).once('value');
    const originalPost = postSnapshot.val();
    if (!originalPost) {
      Swal.fire('Error', 'Post not found', 'error');
      return;
    }

    const { contactPerson, organization } = await fetchUserData(user.uid);
    const sharedPost = {
      title: originalPost.title,
      content: originalPost.content,
      userId: user.uid,
      userName: contactPerson,
      organization: organization,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      mediaUrl: originalPost.mediaUrl,
      mediaUrls: originalPost.mediaUrls,
      mediaType: originalPost.mediaType,
      thumbnailUrl: originalPost.thumbnailUrl,
      originalPostId: postId,
      originalUserName: originalPost.userName,
      isShared: true,
      shareCaption: caption || '',
      category: originalPost.category
    };

    await database.ref('posts').push(sharedPost);
    await logActivity(`${contactPerson}${organization ? ` from ${organization}` : ''} shared a post in ${originalPost.category}`);
    modal.style.display = 'none';
    shareCaptionInput.value = '';
    delete modal.dataset.postId;
    Swal.fire('Success', 'Post shared successfully!', 'success');
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error sharing post:`, error);
    Swal.fire('Error', `Failed to share post: ${error.message}`, 'error');
  }
}

// Comment functions (unchanged)
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
        await database.ref(`posts/${postId}/comments`).push(comment);
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

  const commentRef = database.ref(`posts/${postId}/comments/${commentId}`);
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
        const subCommentsSnapshot = await database.ref(`posts/${postId}/comments`).orderByChild('parentCommentId').equalTo(commentId).once('value');
        const subComments = subCommentsSnapshot.val();
        if (subComments) {
          for (const subCommentId of Object.keys(subComments)) {
            await database.ref(`posts/${postId}/comments/${subCommentId}`).remove();
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
      database.ref(`posts/${postId}/comments`).once('value').then(snap => {
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

  database.ref(`posts/${postId}/comments`).orderByChild('timestamp').on('value', async (snapshot) => {
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
          <strong>${comment.userName}</strong>
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

// Enhanced loadPosts with fallback image fetching
async function loadPosts() {
  console.log(`[${new Date().toISOString()}] Loading posts with filter: ${selectedCategoryFilter}`);
  const postsContainer = document.getElementById('posts');
  if (!postsContainer) {
    console.error(`[${new Date().toISOString()}] Posts container not found`);
    Swal.fire('Error', 'Posts container not found.', 'error');
    return;
  }

  database.ref('posts').orderByChild('timestamp').on('value', async (snapshot) => {
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
        // Handle single mediaUrl
        if (post.mediaUrl && post.mediaType === 'image') {
          if (post.mediaUrl.startsWith('https://')) {
            try {
              console.log(`[${new Date().toISOString()}] Validating image URL for post ${id}: ${post.mediaUrl}`);
              await storage.refFromURL(post.mediaUrl).getMetadata();
              mediaHtml = `
                <img src="${post.mediaUrl}" class="post-media" alt="Post media" onerror="this.style.display='none';this.nextElementSibling.style.display='block';console.error('Image load failed for post ${id}: ${post.mediaUrl}')">
                <div style="display:none;color:red;text-align:center;font-size:14px;">Failed to load image.</div>
              `;
            } catch (error) {
              console.error(`[${new Date().toISOString()}] Invalid or inaccessible image URL for post ${id}: ${post.mediaUrl}`, error);
              mediaHtml = '<div style="color:red;text-align:center;font-size:14px;">Image not accessible: Invalid URL or permission denied.</div>';
            }
          } else {
            console.error(`[${new Date().toISOString()}] Invalid image URL format for post ${id}: ${post.mediaUrl}`);
            mediaHtml = '<div style="color:red;text-align:center;font-size:14px;">Invalid image URL format.</div>';
          }
        } else if (post.mediaUrl && post.mediaType === 'video') {
          mediaHtml = `
            <video src="${post.mediaUrl}" class="post-media" poster="${post.thumbnailUrl || ''}" controls onerror="this.nextElementSibling.style.display='block';this.style.display='none';console.error('Video load failed for post ${id}: ${post.mediaUrl}')">
            </video><div style="display:none;color:red;text-align:center;font-size:14px;">Failed to load video.</div>
          `;
        }
        // Handle multiple mediaUrls
        if (post.mediaUrls && Array.isArray(post.mediaUrls)) {
          for (const [index, url] of post.mediaUrls.entries()) {
            if (url.startsWith('https://')) {
              try {
                console.log(`[${new Date().toISOString()}] Validating mediaUrls[${index}] for post ${id}: ${url}`);
                await storage.refFromURL(url).getMetadata();
                mediaHtml += `
                  <img src="${url}" class="post-media" alt="Post media ${index}" onerror="this.style.display='none';this.nextElementSibling.style.display='block';console.error('Image load failed for post ${id}, index ${index}: ${url}')">
                  <div style="display:none;color:red;text-align:center;font-size:14px;">Failed to load image ${index}.</div>
                `;
              } catch (error) {
                console.error(`[${new Date().toISOString()}] Invalid or inaccessible image URL in mediaUrls for post ${id}: ${url}`, error);
                mediaHtml += '<div style="color:red;text-align:center;font-size:14px;">Image not accessible: Invalid URL or permission denied.</div>';
              }
            } else {
              console.error(`[${new Date().toISOString()}] Invalid image URL format in mediaUrls for post ${id}: ${url}`);
              mediaHtml += '<div style="color:red;text-align:center;font-size:14px;">Invalid image URL format.</div>';
            }
          }
        }
        // Fallback: Fetch images from Storage if no valid URLs
        if (!post.mediaUrl && (!post.mediaUrls || post.mediaUrls.length === 0) && post.mediaType === 'image') {
          console.log(`[${new Date().toISOString()}] No valid media URLs for post ${id}, attempting fallback fetch`);
          try {
            const storageRef = storage.ref(`image_posts/${post.userId}`);
            const listResult = await storageRef.listAll();
            const imageUrls = await Promise.all(
              listResult.items.slice(0, 1).map(async (itemRef) => {
                try {
                  const url = await itemRef.getDownloadURL();
                  console.log(`[${new Date().toISOString()}] Fallback image URL retrieved for post ${id}: ${url}`);
                  return url;
                } catch (error) {
                  console.error(`[${new Date().toISOString()}] Error getting fallback URL for ${itemRef.name}:`, error);
                  return null;
                }
              })
            );
            const validUrls = imageUrls.filter(url => url);
            if (validUrls.length > 0) {
              mediaHtml = `
                <img src="${validUrls[0]}" class="post-media" alt="Fallback media" onerror="this.style.display='none';this.nextElementSibling.style.display='block';console.error('Fallback image load failed for post ${id}: ${validUrls[0]}')">
                <div style="display:none;color:red;text-align:center;font-size:14px;">Failed to load fallback image.</div>
              `;
            } else {
              mediaHtml = '<div style="color:red;text-align:center;font-size:14px;">No images found in Storage.</div>';
            }
          } catch (error) {
            console.error(`[${new Date().toISOString()}] Fallback fetch failed for post ${id}:`, error);
            mediaHtml = '<div style="color:red;text-align:center;font-size:14px;">Failed to fetch images from Storage.</div>';
          }
        }

        const canEdit = user && user.uid === post.userId;
        const isShared = post.isShared || false;
        const sharedInfo = isShared ? `<small class="shared-info">Shared from ${post.originalUserName || 'Anonymous'}'s post</small>` : '';
        const contentWrapperStyle = isShared ? `style="border-color: transparent;"` : '';
        const contentHr = isShared ? `<hr>` : '';
        const captionHtml = isShared && post.shareCaption ? `<p class="share-caption">${post.shareCaption}</p>` : '';

        const commentCount = await database.ref(`posts/${id}/comments`).once('value').then(snap => snap.numChildren());

        postElem.innerHTML = `
          <div class="post-header">
            <div class="post-user-info">
              <strong style="color: #121212">${post.userName || 'Anonymous'}</strong>
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
      postsContainer.innerHTML = '<p style="text-align: center; color: #666;">No posts available.</p>';
    }
  }, (error) => {
    console.error(`[${new Date().toISOString()}] Error loading posts:`, error);
    Swal.fire('Error', `Failed to load posts: ${error.message}`, 'error');
    postsContainer.innerHTML = '<p style="text-align: center; color: #666;">Error loading posts.</p>';
  });
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
  if (!titleElem || !contentElem || !menuDropdown) {
    console.error(`[${new Date().toISOString()}] Post title, content, or menu dropdown not found for post: ${id}`);
    Swal.fire('Error', 'Post elements not found. Please try refreshing the page.', 'error');
    return;
  }

  if (contentElem.getAttribute('contenteditable') === 'true') {
    titleElem.setAttribute('contenteditable', 'false');
    contentElem.setAttribute('contenteditable', 'false');
    if (!titleElem.textContent.trim()) titleElem.style.display = 'none';
    menuDropdown.querySelector('button[onclick*="toggleEdit"]').textContent = 'Edit';
    try {
      console.log(`[${new Date().toISOString()}] Updating post: ${id}`);
      await database.ref(`posts/${id}`).update({
        title: titleElem.textContent.trim(),
        content: contentElem.textContent.trim(),
        editedTimestamp: firebase.database.ServerValue.TIMESTAMP
      });
      const { contactPerson, organization } = await fetchUserData(user.uid);
      await logActivity(`${contactPerson}${organization ? ` from ${organization}` : ''} edited a post`);
      console.log(`[${new Date().toISOString()}] Post updated successfully: ${id}`);
      Swal.fire('Success', 'Post updated successfully!', 'success');
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error updating post:`, error);
      Swal.fire('Error', `Failed to update post: ${error.message}`, 'error');
    }
  } else {
    titleElem.setAttribute('contenteditable', 'true');
    titleElem.style.display = 'block';
    contentElem.setAttribute('contenteditable', 'true');
    contentElem.focus();
    menuDropdown.querySelector('button[onclick*="toggleEdit"]').textContent = 'Save';
  }
}

async function deletePost(id) {
  console.log(`[${new Date().toISOString()}] deletePost called for post: ${id}`);
  const postRef = database.ref(`posts/${id}`);
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
        console.log(`[${new Date().toISOString()}] Moving post ${id} to deleted archive for user: ${user.uid}`);
        // Copy post to deleted archive
        const deletedPostRef = database.ref(`posts/deleted/${user.uid}/${id}`);
        await deletedPostRef.set({
          ...post,
          deletedTimestamp: firebase.database.ServerValue.TIMESTAMP
        });
        console.log(`[${new Date().toISOString()}] Post copied to posts/deleted/${user.uid}/${id}`);

        // Remove post from main posts node
        await postRef.remove();
        console.log(`[${new Date().toISOString()}] Post removed from posts/${id}`);

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
      activityArray.sort((a, b) => b.timestamp - a.timestamp);
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

// Setup modal (unchanged)
function setupModal() {
  const modal = document.getElementById('post-modal');
  if (!modal) {
    console.error(`[${new Date().toISOString()}] Post modal not found`);
    Swal.fire('Error', 'Post modal not found. Please reload the page.', 'error');
    return;
  }

  const postCloseButton = document.querySelector('#post-modal .close-button');
  const postButtons = document.querySelectorAll('.post-option');
  const modalPostContent = document.getElementById('modal-post-content');
  const modalPostCategory = document.getElementById('modal-post-category');
  const mediaInput = document.getElementById('modal-media-upload');
  const mediaPreview = document.getElementById('modal-media-preview');
  const tapToUploadButton = document.getElementById('tap-to-upload');
  const shareModal = document.getElementById('share-post-modal');
  const shareCloseButton = document.querySelector('#share-post-modal .close-button');
  const shareCancelButton = document.getElementById('share-cancel-button');
  const shareSubmitButton = document.getElementById('share-submit-button');
  const sortButton = document.getElementById('sort-posts-button');
  const categoryFilter = document.getElementById('category-filter');

  function resizeTextarea() {
    modalPostContent.style.height = 'auto';
    const newHeight = Math.max(modalPostContent.scrollHeight, 80);
    modalPostContent.style.height = `${newHeight}px`;
    console.log(`[${new Date().toISOString()}] Textarea resized to: ${newHeight}px`);
  }

  let resizeTimeout;
  function debouncedResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resizeTextarea, 50);
  }

  if (postButtons && modalPostContent && modalPostCategory && mediaInput && modal && postCloseButton && tapToUploadButton) {
    mediaInput.setAttribute('multiple', 'true');
    postButtons.forEach(button => {
      button.addEventListener('click', () => {
        postButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const type = button.dataset.type;
        modal.style.display = 'block';

        const modalButtons = modal.querySelectorAll('.modal-buttons .post-option');
        modalButtons.forEach(btn => {
          btn.style.display = btn.dataset.type === type ? 'none' : 'inline-block';
        });

        tapToUploadButton.style.display = 'none';
        tapToUploadButton.textContent = 'Tap to Upload Image';
        mediaInput.value = '';
        mediaPreview.innerHTML = '';

        if (type === 'image') {
          mediaInput.accept = 'image/jpeg,image/png';
          tapToUploadButton.style.display = 'block';
          setTimeout(() => {
            mediaInput.click();
            console.log(`[${new Date().toISOString()}] File explorer triggered for image upload`);
          }, 0);
        } else if (type === 'video') {
          mediaInput.accept = 'video/mp4,video/webm';
          mediaInput.removeAttribute('multiple');
          mediaInput.click();
        } else if (type === 'link') {
          modalPostContent.placeholder = 'Paste your link here';
          modalPostContent.focus();
          resizeTextarea();
        } else if (type === 'category') {
          modalPostCategory.focus();
        } else {
          modalPostContent.placeholder = "What's on your mind?";
          modalPostContent.focus();
          resizeTextarea();
        }
      });
    });

    tapToUploadButton.addEventListener('click', () => {
      console.log(`[${new Date().toISOString()}] Tap to Upload button clicked`);
      mediaInput.click();
    });

    postCloseButton.addEventListener('click', () => {
      modal.style.display = 'none';
      modalPostContent.value = '';
      document.getElementById('modal-post-title').value = '';
      modalPostCategory.value = '';
      modalPostContent.placeholder = "What's on your mind?";
      modalPostContent.style.height = '80px';
      mediaInput.value = '';
      mediaPreview.innerHTML = '';
      tapToUploadButton.style.display = 'none';
      tapToUploadButton.textContent = 'Tap to Upload Image';
      const modalButtons = modal.querySelectorAll('.modal-buttons .post-option');
      modalButtons.forEach(btn => btn.style.display = 'inline-block');
    });

    mediaInput.addEventListener('change', (event) => {
      console.log(`[${new Date().toISOString()}] Media input changed`);
      const files = event.target.files;
      mediaPreview.innerHTML = '';
      if (files.length) {
        tapToUploadButton.textContent = `${files.length} File${files.length > 1 ? 's' : ''} Selected`;
        tapToUploadButton.classList.add('image-selected');
        for (const file of files) {
          if (!['image/jpeg', 'image/png', 'video/mp4', 'video/webm'].includes(file.type)) {
            console.log(`[${new Date().toISOString()}] Invalid file type selected: ${file.type}`);
            Swal.fire('Unsupported file type', 'Please upload JPEG, PNG, MP4, or WebM files', 'error');
            event.target.value = '';
            tapToUploadButton.textContent = 'Tap to Upload Image';
            tapToUploadButton.classList.remove('image-selected');
            return;
          }
          console.log(`[${new Date().toISOString()}] Previewing file: ${file.name}`);
          if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.className = 'media-preview';
            mediaPreview.appendChild(img);
          } else {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.className = 'media-preview';
            video.controls = true;
            mediaPreview.appendChild(video);
          }
        }
      } else {
        tapToUploadButton.textContent = 'Tap to Upload Image';
        tapToUploadButton.classList.remove('image-selected');
      }
    });

    modalPostContent.addEventListener('input', debouncedResize);
    modalPostContent.addEventListener('focus', resizeTextarea);
    modalPostContent.addEventListener('change', resizeTextarea);
  } else {
    console.error(`[${new Date().toISOString()}] Post modal elements missing`);
    Swal.fire('Error', 'Post modal elements missing. Please try refreshing the page.', 'error');
  }

  function closeShareModal() {
    if (shareModal) {
      shareModal.style.display = 'none';
      const shareContent = document.getElementById('share-post-content');
      const shareCaptionInput = document.getElementById('share-caption-input');
      if (shareContent) shareContent.innerHTML = '';
      if (shareCaptionInput) shareCaptionInput.value = '';
      delete shareModal.dataset.postId;
    }
  }

  if (shareCloseButton) {
    shareCloseButton.addEventListener('click', closeShareModal);
  }
  if (shareCancelButton) {
    shareCancelButton.addEventListener('click', closeShareModal);
  }
  if (shareSubmitButton) {
    shareSubmitButton.addEventListener('click', submitSharePost);
  }

  if (sortButton) {
    sortButton.addEventListener('click', () => {
      sortOrder = sortOrder === 'newest' ? 'oldest' : 'newest';
      const icon = sortButton.querySelector('i');
      icon.className = sortOrder === 'newest' ? 'bx bx-sort-up' : 'bx bx-sort-down';
      loadPosts();
    });
  }

  if (categoryFilter) {
    categoryFilter.addEventListener('change', () => {
      selectedCategoryFilter = categoryFilter.value;
      loadPosts();
    });
  }
}

// Initialize image gallery display
async function initializeImageDisplay() {
  console.log(`[${new Date().toISOString()}] Initializing image display`);
  const imageUrls = await listUserImages();
  displayImages(imageUrls, 'image-gallery');
}

document.addEventListener('DOMContentLoaded', () => {
  console.log(`[${new Date().toISOString()}] DOMContentLoaded: Initializing`);
  setupModal();
  initializeImageDisplay();
  if (typeof initializeDashboard !== 'undefined') {
    initializeDashboard();
  } else {
    console.warn(`[${new Date().toISOString()}] initializeDashboard function not found`);
  }

  const postButton = document.getElementById('modal-post-button');
  if (postButton) {
    postButton.addEventListener('click', createPost);
  } else {
    console.error(`[${new Date().toISOString()}] Post button not found`);
    Swal.fire('Error', 'Post button not found.', 'error');
  }
});

window.addEventListener('dashboard-loaded', () => {
  console.log(`[${new Date().toISOString()}] dashboard-loaded event: Initializing`);
  if (typeof initializeDashboard !== 'undefined') {
    initializeDashboard();
  } else {
    console.warn(`[${new Date().toISOString()}] initializeDashboard function not found`);
  }
});