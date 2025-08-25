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

// Variables for inactivity detection
let inactivityTimeout;
const INACTIVITY_TIME = 1800000;

function resetInactivityTimer() {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(checkInactivity, INACTIVITY_TIME);
    console.log(`[${new Date().toISOString()}] Inactivity timer reset.`);
}

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
          console.log(`[${new Date().toISOString()}] Image compressed: ${file.size} bytes -> ${blob.size} bytes`);
          resolve(blob);
        }, file.type, 0.7);
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
            console.log(`[${new Date().toISOString()}] Video thumbnail generated: ${thumbnailBlob.size} bytes`);
            resolve({ video: file, thumbnail: thumbnailBlob });
          }, 'image/jpeg', 0.7);
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
      contactPerson: userData.contactPerson || (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : userData.displayName || 'Anonymous'),
      organization: userData.organization || 'No Organization'
    };
    userOrgCache.set(uid, data);
    console.log(`[${new Date().toISOString()}] User data fetched:`, data);
    return data;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching user data:`, error);
    return { contactPerson: 'Anonymous', organization: 'No Organization' };
  }
}

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
    userName.textContent = userData.contactPerson;
    userOrg.textContent = userData.organization === 'No Organization' ? '' : userData.organization;
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

  const modalPostTitle = document.getElementById('modal-post-title');
  const modalPostContent = document.getElementById('modal-post-content');
  const modalPostCategory = document.getElementById('modal-post-category');
  const mediaInput = document.getElementById('modal-media-upload');
  const webUrlInput = document.getElementById('modal-web-url-input');
  const postButton = document.getElementById('modal-post-button');
  const modal = document.getElementById('post-modal');
  const mediaPreview = document.getElementById('modal-media-preview');
  const mediaButtons = document.querySelector('.media-buttons');

  // Check if all required elements exist
  if (!modalPostTitle || !modalPostContent || !modalPostCategory || !mediaInput || !webUrlInput || !postButton || !modal || !mediaPreview || !mediaButtons) {
    console.error(`[${new Date().toISOString()}] DOM elements missing`);
    Swal.fire({
      icon: 'error',
      title: 'Page Error',
      text: 'Some page elements are missing. Please try reloading the page.',
      confirmButtonText: 'Reload'
    }).then(() => {
      window.location.reload();
    });
    return;
  }

  const title = modalPostTitle.value.trim();
  const content = modalPostContent.value.trim();
  const category = modalPostCategory.value;
  const files = Array.from(mediaInput.files);
  const webUrls = webUrlInput.value.trim().split('\n').filter(url => url.trim());

  // Validation
  if (!category) {
    console.log(`[${new Date().toISOString()}] No category selected`);
    Swal.fire('Please select a category', '', 'warning');
    return;
  }
  if (!content && !files.length && !webUrls.length) {
    console.log(`[${new Date().toISOString()}] No content or media provided`);
    Swal.fire('Missing Field', 'Please add content or media to post', 'warning');
    return;
  }
  if (files.length > 30 || webUrls.length > 30) {
    console.log(`[${new Date().toISOString()}] Too many files or URLs`);
    Swal.fire('Limit Exceeded', 'You can upload up to 30 images or add 30 web URLs', 'warning');
    return;
  }

  console.log(`[${new Date().toISOString()}] Posting with title: ${title}, content: ${content}, category: ${category}, files: ${files.length}, urls: ${webUrls.length}`);
  postButton.classList.add('loading');
  modal.classList.add('disabled');

  try {
    const mediaItems = [];

    // Process uploaded files as Base64
    for (const file of files) {
      console.log(`[${new Date().toISOString()}] Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`);
      if (!['image/jpeg', 'image/png', 'video/mp4', 'video/webm'].includes(file.type)) {
        console.log(`[${new Date().toISOString()}] Invalid file type: ${file.type}`);
        Swal.fire('Unsupported file type', 'Please upload JPEG, PNG, MP4, or WebM files', 'error');
        throw new Error(`Unsupported file type: ${file.type}`);
      }
      if (file.size > 5 * 1024 * 1024) {
        console.log(`[${new Date().toISOString()}] File size exceeds 5MB limit: ${file.size}`);
        Swal.fire('File too large', 'Maximum file size is 5MB', 'error');
        throw new Error('File size exceeds 5MB');
      }

      let result;
      try {
        result = await compressMedia(file);
        console.log(`[${new Date().toISOString()}] Compression successful for ${file.name}`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Compression failed for ${file.name}:`, error);
        Swal.fire('Error', `Failed to compress ${file.name}: ${error.message}`, 'error');
        throw error;
      }

      try {
        if (file.type.startsWith('image/')) {
          // Convert compressed image to Base64
          const base64Image = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(result);
          });
          console.log(`[${new Date().toISOString()}] Image converted to Base64: ${file.name}`);
          mediaItems.push({ data: base64Image, type: 'image' });
        } else {
          // Convert video to Base64
          const base64Video = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(result.video);
          });
          // Convert thumbnail to Base64
          const base64Thumbnail = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(result.thumbnail);
          });
          console.log(`[${new Date().toISOString()}] Video and thumbnail converted to Base64: ${file.name}`);
          mediaItems.push({ data: base64Video, type: 'video', thumbnail: base64Thumbnail });
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Base64 conversion failed for ${file.name}:`, error);
        Swal.fire('Error', `Failed to convert ${file.name} to Base64: ${error.message}`, 'error');
        throw error;
      }
    }

    // Process web URLs (unchanged, as they are already URLs)
    for (const url of webUrls) {
      console.log(`[${new Date().toISOString()}] Processing URL: ${url}`);
      if (!url.match(/^https?:\/\/.*\.(?:png|jpg|jpeg)$/i)) {
        console.log(`[${new Date().toISOString()}] Invalid image URL: ${url}`);
        Swal.fire('Invalid URL', 'Please provide valid image URLs (PNG, JPG, JPEG)', 'warning');
        throw new Error(`Invalid image URL: ${url}`);
      }
      mediaItems.push({ url, type: 'image' });
    }

    // Create post object
    const { contactPerson, organization } = await fetchUserData(user.uid);
    const post = {
      title: title || '',
      content: content || '',
      userId: user.uid,
      userName: contactPerson || 'Anonymous',
      organization: organization === 'No Organization' ? '' : organization,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      media: mediaItems,
      category: category
    };
    console.log(`[${new Date().toISOString()}] Post data:`, JSON.stringify(post));

    // Save post to database
    const newPostRef = await database.ref('posts').push(post);
    console.log(`[${new Date().toISOString()}] Post written to database with ID: ${newPostRef.key}`);
    await logActivity(`${contactPerson}${organization === 'No Organization' ? '' : ` from ${organization}`} created a new post in ${category}`);

    // Reset form
    modalPostTitle.value = '';
    modalPostContent.value = '';
    modalPostCategory.value = '';
    mediaInput.value = '';
    webUrlInput.value = '';
    mediaPreview.innerHTML = '';
    modal.style.display = 'none';
    modalPostContent.style.height = '80px';
    mediaButtons.style.display = 'flex';
    document.getElementById('url-error').textContent = '';
    document.getElementById('modal-web-url-input').style.display = 'none';
    document.getElementById('insert-web-url').style.display = 'none';
    console.log(`[${new Date().toISOString()}] Post created successfully`);
    Swal.fire('Success', 'Post created successfully!', 'success');

    const modalButtons = modal.querySelectorAll('.modal-buttons .post-option');
    modalButtons.forEach(btn => btn.style.display = 'inline-block');
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error creating post:`, error);
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
    if (post.media && post.media.length) {
      mediaHtml = post.media.map(item => {
        if (item.type === 'image') {
          const src = item.data || item.url; // Use data for Base64, url for web URLs
          return `<img src="${src}" class="post-media" alt="Post media" onerror="this.style.display='none'">`;
        } else if (item.type === 'video') {
          return `<video src="${item.data}" class="post-media" poster="${item.thumbnail || ''}" controls></video>`;
        }
      }).join('');
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
  const modalPostCategory = document.getElementById('modal-post-category');
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
    const postSnapshot = await database.ref(`posts/${postId}`).once('value');
    const originalPost = postSnapshot.val();
    if (!originalPost) {
      console.error(`[${new Date().toISOString()}] Original post not found for ID: ${postId}`);
      Swal.fire('Error', 'Post not found', 'error');
      return;
    }
    console.log(`[${new Date().toISOString()}] Original post data:`, JSON.stringify(originalPost));

    const { contactPerson, organization } = await fetchUserData(user.uid);
    const sanitizedMedia = Array.isArray(originalPost.media)
      ? originalPost.media.filter(item => {
          if (!item || typeof item !== 'object') {
            console.warn(`[${new Date().toISOString()}] Invalid media item:`, item);
            return false;
          }
          if (!item.url || !item.type || typeof item.url !== 'string' || typeof item.type !== 'string') {
            console.warn(`[${new Date().toISOString()}] Media item missing url or type:`, item);
            return false;
          }
          if (item.type === 'video' && (!item.thumbnail || typeof item.thumbnail !== 'string')) {
            console.warn(`[${new Date().toISOString()}] Video missing valid thumbnail:`, item);
            return false;
          }
          return true;
        })
      : [];
    console.log(`[${new Date().toISOString()}] Sanitized media:`, sanitizedMedia);

    const sharedPost = {
      title: originalPost.title || '',
      content: originalPost.content || '',
      userId: user.uid,
      userName: contactPerson || 'Anonymous',
      organization: organization === 'No Organization' ? '' : organization,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      media: sanitizedMedia,
      originalPostId: postId,
      originalUserName: originalPost.userName || 'Anonymous',
      isShared: true,
      shareCaption: caption || '',
      category: category
    };
    console.log(`[${new Date().toISOString()}] Shared post data:`, JSON.stringify(sharedPost));

    await database.ref('posts').push(sharedPost);
    await logActivity(`${contactPerson}${organization === 'No Organization' ? '' : ` from ${organization}`} shared a post in ${category}`);
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
        await logActivity(`${contactPerson}${organization === 'No Organization' ? '' : ` from ${organization}`} ${parentCommentId ? 'replied to' : 'commented on'} a post`);
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
        await logActivity(`${contactPerson}${organization === 'No Organization' ? '' : ` from ${organization}`} deleted a comment`);
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
        if (post.media && post.media.length) {
          mediaHtml = post.media.map(item => {
            if (item.type === 'image') {
              const src = item.data || item.url; // Use data for Base64, url for web URLs
              return `<img src="${item.url}" class="post-media" alt="Post media" onerror="this.style.display='none'">`;
            } else if (item.type === 'video') {
              return `<video src="${item.url}" class="post-media" poster="${item.thumbnail || ''}" controls></video>`;
            }
          }).join('');
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
      await logActivity(`${contactPerson}${organization === 'No Organization' ? '' : ` from ${organization}`} edited a post`);
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

  try {
    console.log(`[${new Date().toISOString()}] Deleting post from database: ${id}`);
    await database.ref(`posts/${id}`).remove();
    const { contactPerson, organization } = await fetchUserData(user.uid);
    await logActivity(`${contactPerson}${organization === 'No Organization' ? '' : ` from ${organization}`} deleted a post`);
    console.log(`[${new Date().toISOString()}] Post deleted successfully: ${id}`);
    Swal.fire('Success', 'Post deleted successfully!', 'success');
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error deleting post:`, error);
    Swal.fire('Error', `Failed to delete post: ${error.message}`, 'error');
  }
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

  // Re-render preview
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
    if (file.type.startsWith('video/')) media.controls = true;

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
    <i class='bx bx-image-add' class="material-icons"></i>
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

  const postCloseButton = document.querySelector('#post-modal .close-button');
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
  const shareCloseButton = document.querySelector('#share-post-modal .close-button');
  const shareCancelButton = document.getElementById('share-cancel-button');
  const shareSubmitButton = document.getElementById('share-submit-button');
  const sortButton = document.getElementById('sort-posts-button');
  const categoryFilter = document.getElementById('category-filter');

  // Create URL error message element
  const urlError = document.createElement('p');
  urlError.id = 'url-error';
  urlError.style.color = '#d33';
  urlError.style.fontSize = '0.9em';
  urlError.style.marginTop = '5px';
  webUrlInput.insertAdjacentElement('afterend', urlError);

  // Create Insert button for URLs
  const insertUrlButton = document.createElement('button');
  insertUrlButton.id = 'insert-web-url';
  insertUrlButton.textContent = 'Insert';
  insertUrlButton.style.display = 'none';
  insertUrlButton.style.padding = '8px';
  insertUrlButton.style.borderRadius = '4px';
  insertUrlButton.style.backgroundColor = 'var(--primary-color)';
  insertUrlButton.style.color = '#fff';
  insertUrlButton.style.border = 'none';
  insertUrlButton.style.cursor = 'pointer';
  insertUrlButton.style.marginTop = '5px';
  webUrlInput.insertAdjacentElement('afterend', insertUrlButton);

  function resizeTextarea() {
    const scrollTop = modalPostContent.scrollTop;
    const selectionStart = modalPostContent.selectionStart;
    const selectionEnd = modalPostContent.selectionEnd;
    
    modalPostContent.style.height = 'auto';
    const newHeight = Math.max(modalPostContent.scrollHeight, 80);
    modalPostContent.style.height = `${newHeight}px`;
    
    modalPostContent.scrollTop = scrollTop;
    modalPostContent.setSelectionRange(selectionStart, selectionEnd);
    
    console.log(`[${new Date().toISOString()}] Textarea resized to: ${newHeight}px`);
  }

  let resizeTimeout;
  function debouncedResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resizeTextarea, 50);
  }

  function validateUrls(urls) {
    const urlPattern = /^https?:\/\/.*\.(?:png|jpg|jpeg)$/i;
    return urls.every(url => url.match(urlPattern));
  }

  if (postButtons && modalPostContent && modalPostCategory && mediaInput && webUrlInput && modal && postCloseButton && tapToUploadButton && addWebUrlButton && mediaCaption && mediaButtons) {
    // Update tap-to-upload button content
    tapToUploadButton.innerHTML = `
    <i class='bx bx-image-add' style="margin-right: 6px; font-size: 30;"></i>
    <span>Tap to Upload</span>
    `;

    postButtons.forEach(button => {
      button.addEventListener('click', () => {
        postButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const type = button.dataset.type;
        modal.style.display = 'block';

        tapToUploadButton.style.display = 'inline-block';
        addWebUrlButton.style.display = 'inline-block';
        insertUrlButton.style.display = 'none';
        webUrlInput.style.display = 'none';
        urlError.textContent = '';
        mediaCaption.style.display = mediaInput.files.length || webUrlInput.value.trim() ? 'none' : 'block';
        mediaButtons.style.display = mediaInput.files.length || webUrlInput.value.trim() ? 'none' : 'flex';

        if (type === 'image') {
          mediaButtons.style.display = 'flex';
          mediaInput.accept = 'image/jpeg,image/png';
        } else if (type === 'video') {
          mediaButtons.style.display = 'flex';
          mediaInput.accept = 'video/mp4,video/webm';
          mediaInput.removeAttribute('multiple');
          mediaInput.click();
        } else if (type === 'link') {
          mediaButtons.style.display = 'flex';
          addWebUrlButton.click();
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

    addWebUrlButton.addEventListener('click', () => {
      console.log(`[${new Date().toISOString()}] Add Web URL button clicked`);
      webUrlInput.style.display = 'block';
      insertUrlButton.style.display = 'block';
      mediaButtons.style.display = 'none';
      webUrlInput.focus();
      urlError.textContent = '';
      mediaCaption.style.display = mediaInput.files.length || webUrlInput.value.trim() ? 'none' : 'block';
    });

    postCloseButton.addEventListener('click', () => {
      modal.style.display = 'none';
      modalPostContent.value = '';
      document.getElementById('modal-post-title').value = '';
      modalPostCategory.value = '';
      modalPostContent.placeholder = "What's on your mind?";
      modalPostContent.style.height = '80px';
      mediaInput.value = '';
      webUrlInput.value = '';
      webUrlInput.style.display = 'none';
      insertUrlButton.style.display = 'none';
      urlError.textContent = '';
      mediaPreview.innerHTML = '';
      tapToUploadButton.innerHTML = `
        <i class='bx bx-image-add' class="material-icons"></i>
        <span>Tap to Upload</span>
      `;
      tapToUploadButton.classList.remove('image-selected');
      mediaButtons.style.display = 'flex';
      mediaCaption.style.display = 'block';
      const modalButtons = modal.querySelectorAll('.modal-buttons .post-option');
      modalButtons.forEach(btn => btn.style.display = 'inline-block');
    });

    mediaInput.addEventListener('change', (event) => {
      console.log(`[${new Date().toISOString()}] Media input changed`);
      const files = Array.from(event.target.files);
      mediaPreview.innerHTML = '';
      if (files.length) {
        mediaCaption.style.display = 'none';
        mediaButtons.style.display = 'none';
        files.forEach((file, index) => {
          if (!['image/jpeg', 'image/png', 'video/mp4', 'video/webm'].includes(file.type)) {
            console.log(`[${new Date().toISOString()}] Invalid file type selected: ${file.type}`);
            Swal.fire('Unsupported file type', 'Please upload JPEG, PNG, MP4, or WebM files', 'error');
            return;
          }
          console.log(`[${new Date().toISOString()}] Previewing file: ${file.name}`);
          tapToUploadButton.innerHTML = `
             <i class='bx bx-image-add' class="material-icons"></i>
            <span>Image/Video Selected</span>
          `;
          tapToUploadButton.classList.add('image-selected');
          const itemDiv = document.createElement('div');
          itemDiv.className = 'preview-item';
          const media = file.type.startsWith('image/') ? document.createElement('img') : document.createElement('video');
          media.src = URL.createObjectURL(file);
          media.className = 'media-preview';
          if (file.type.startsWith('video/')) media.controls = true;

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
          deleteBtn.onclick = () => removePreviewItem(index, 'file', mediaInput, webUrlInput, mediaPreview, tapToUploadButton, mediaCaption);
          itemDiv.appendChild(media);
          itemDiv.appendChild(dimensionsDiv);
          itemDiv.appendChild(deleteBtn);
          mediaPreview.appendChild(itemDiv);
        });
      } else {
        tapToUploadButton.innerHTML = `
          <i class='bx bx-image-add' class="material-icons"></i>
          <span>Tap to Upload</span>
        `;
        tapToUploadButton.classList.remove('image-selected');
        mediaCaption.style.display = webUrlInput.value.trim() ? 'none' : 'block';
        mediaButtons.style.display = webUrlInput.value.trim() ? 'none' : 'flex';
      }

      // Re-render URLs if any
      const urls = webUrlInput.value.trim().split('\n').filter(url => url.trim());
      urls.forEach((url, index) => {
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
        deleteBtn.onclick = () => removePreviewItem(index, 'url', mediaInput, webUrlInput, mediaPreview, tapToUploadButton, mediaCaption);
        itemDiv.appendChild(img);
        itemDiv.appendChild(dimensionsDiv);
        itemDiv.appendChild(deleteBtn);
        mediaPreview.appendChild(itemDiv);
      });
    });

    insertUrlButton.addEventListener('click', () => {
      console.log(`[${new Date().toISOString()}] Insert URL button clicked`);
      const urls = webUrlInput.value.trim().split('\n').filter(url => url.trim());
      if (!urls.length) {
        urlError.textContent = 'Please enter at least one URL.';
        return;
      }
      if (!validateUrls(urls)) {
        urlError.textContent = 'Please provide valid image URLs (PNG, JPG, JPEG).';
        return;
      }
      urlError.textContent = '';
      mediaButtons.style.display = 'none';
      mediaPreview.innerHTML = '';

      // Re-render files
      const files = Array.from(mediaInput.files);
      files.forEach((file, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'preview-item';
        const media = file.type.startsWith('image/') ? document.createElement('img') : document.createElement('video');
        media.src = URL.createObjectURL(file);
        media.className = 'media-preview';
        if (file.type.startsWith('video/')) media.controls = true;
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
        deleteBtn.onclick = () => removePreviewItem(index, 'file', mediaInput, webUrlInput, mediaPreview, tapToUploadButton, mediaCaption);
        itemDiv.appendChild(media);
        itemDiv.appendChild(dimensionsDiv);
        itemDiv.appendChild(deleteBtn);
        mediaPreview.appendChild(itemDiv);
      });

      // Render URLs
      urls.forEach((url, index) => {
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
        deleteBtn.onclick = () => removePreviewItem(index, 'url', mediaInput, webUrlInput, mediaPreview, tapToUploadButton, mediaCaption);
        itemDiv.appendChild(img);
        itemDiv.appendChild(dimensionsDiv);
        itemDiv.appendChild(deleteBtn);
        mediaPreview.appendChild(itemDiv);
      });

      mediaCaption.style.display = files.length || urls.length ? 'none' : 'block';
    });

    webUrlInput.addEventListener('input', () => {
      const urls = webUrlInput.value.trim().split('\n').filter(url => url.trim());
      urlError.textContent = urls.length && !validateUrls(urls) ? 'Please provide valid image URLs (PNG, JPG, JPEG).' : '';
      mediaButtons.style.display = urls.length || mediaInput.files.length ? 'none' : 'flex';
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
      modalPostCategory.value = '';
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