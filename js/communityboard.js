const firebaseConfig = {
  apiKey: "AIzaSyDJxMv8GCaMvQT2QBW3CdzA3dV5X_T2KqQ",
  authDomain: "bayanihan-5ce7e.firebaseapp.com",
  databaseURL: "https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bayanihan-5ce7e",
  storageBucket: "bayanihan-5ce7e.appspot.com",
  messagingSenderId: "593123849917",
  appId: "1:593123849917:web:eb85a63a536eeff78ce9d4",
  measurementId: "G-ZTQ9VXXVV0"
};

let auth, database, storage;
try {
  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  database = firebase.database();
  storage = firebase.storage();
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization failed:', error);
  Swal.fire('Error', 'Failed to initialize Firebase. Please check your configuration.', 'error');
}

let user = null;
const userOrgCache = new Map();

async function fetchUserData(uid) {
  if (userOrgCache.has(uid)) {
    console.log('Using cached user data for user:', uid);
    return userOrgCache.get(uid);
  }

  try {
    console.log('Fetching user data for user:', uid);
    const snapshot = await database.ref(`users/${uid}`).once('value');
    const userData = snapshot.val() || {};
    const data = {
      contactPerson: userData.contactPerson || userData.displayName || 'Anonymous',
      organization: userData.organization || ''
    };
    userOrgCache.set(uid, data);
    console.log('User data fetched:', data);
    return data;
  } catch (error) {
    console.error('Error fetching user data:', error.code, error.message);
    return { contactPerson: 'Anonymous', organization: '' };
  }
}

auth.onAuthStateChanged(async (currentUser) => {
  user = currentUser;
  console.log('Auth state changed:', currentUser ? { uid: currentUser.uid, displayName: currentUser.displayName } : 'No user');
  if (user) {
    loadPosts();
    loadActivityLog();
    const userData = await fetchUserData(user.uid);
    updateModalUserInfo(userData);
  } else {
    Swal.fire({
      title: 'Authentication Required',
      text: 'Please log in to post or view posts.',
      icon: 'warning',
      confirmButtonText: 'OK'
    });
    const postsContainer = document.getElementById('posts');
    if (postsContainer) {
      postsContainer.innerHTML = '<p>Please log in to view posts.</p>';
    }
  }
});

function updateModalUserInfo(userData) {
  const userName = document.getElementById('modal-user-name');
  const userOrg = document.getElementById('modal-user-org');
  if (userName && userOrg) {
    userName.textContent = userData.contactPerson;
    userOrg.textContent = userData.organization;
  }
}

async function createPost() {
  console.log('createPost called');
  if (!user) {
    console.log('No user logged in');
    Swal.fire('Please log in to post', '', 'warning');
    return;
  }

  const modalPostTitle = document.getElementById('modal-post-title');
  const modalPostContent = document.getElementById('modal-post-content');
  const mediaInput = document.getElementById('modal-media-upload');
  const postButton = document.getElementById('modal-post-button');
  const modal = document.getElementById('post-modal');
  const mediaPreview = document.getElementById('modal-media-preview');

  if (!modalPostTitle || !modalPostContent || !mediaInput || !postButton || !modal || !mediaPreview) {
    console.error('DOM elements missing:', { modalPostTitle, modalPostContent, mediaInput, postButton, modal, mediaPreview });
    Swal.fire('Error', 'Page elements not found. Please try refreshing the page.', 'error');
    return;
  }

  const title = modalPostTitle.value.trim();
  const content = modalPostContent.value.trim();
  const file = mediaInput.files[0];
  if (!title && !content && !file) {
    console.log('No title, content, or media provided');
    Swal.fire('Please add a title, content, or media to post', '', 'warning');
    return;
  }

  console.log('Attempting to create post with title:', title, 'content:', content, 'and file:', file ? file.name : 'none');
  postButton.classList.add('loading');
  modal.classList.add('loading');

  let mediaUrl = '';
  let mediaType = '';
  
  if (file) {
    console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
    if (file.size > 10 * 1024 * 1024) {
      console.log('File size exceeds 10MB');
      Swal.fire('File too large', 'Maximum file size is 10MB', 'error');
      postButton.classList.remove('loading');
      modal.classList.remove('loading');
      return;
    }

    if (!['image/jpeg', 'image/png', 'video/mp4', 'video/webm'].includes(file.type)) {
      console.log('Invalid file type:', file.type);
      Swal.fire('Unsupported file type', 'Please upload JPEG/PNG images or MP4/WebM videos', 'error');
      postButton.classList.remove('loading');
      modal.classList.remove('loading');
      mediaInput.value = '';
      mediaPreview.innerHTML = '';
      return;
    }

    const storageRef = storage.ref(`posts/${user.uid}/${Date.now()}_${file.name}`);
    try {
      const snapshot = await storageRef.put(file);
      mediaUrl = await snapshot.ref.getDownloadURL();
      mediaType = file.type.startsWith('image/') ? 'image' : 'video';
      console.log('Media uploaded successfully:', mediaUrl);
    } catch (error) {
      console.error('Error uploading media:', error.code, error.message);
      Swal.fire('Error uploading media', `Failed to upload media: ${error.message}`, 'error');
      postButton.classList.remove('loading');
      modal.classList.remove('loading');
      return;
    }
  }

  const { contactPerson, organization } = await fetchUserData(user.uid);
  const post = {
    title: title,
    content: content,
    userId: user.uid,
    userName: contactPerson,
    organization: organization,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    mediaUrl: mediaUrl,
    mediaType: mediaType
  };

  try {
    console.log('Writing post to database:', post);
    await database.ref('posts').push(post);
    await logActivity(`${contactPerson} from ${organization} created a new post`);
    modalPostTitle.value = '';
    modalPostContent.value = '';
    mediaInput.value = '';
    mediaPreview.innerHTML = '';
    modal.style.display = 'none';
    modalPostContent.style.height = '80px'; // Reset textarea height
    console.log('Post created successfully');
    Swal.fire('Success', 'Post created successfully!', 'success');
  } catch (error) {
    console.error('Error creating post:', error.code, error.message);
    Swal.fire('Error creating post', `Failed to create post: ${error.message}`, 'error');
  } finally {
    postButton.classList.remove('loading');
    modal.classList.remove('loading');
  }
}

async function sharePost(id) {
  console.log('sharePost called for post:', id);
  if (!user) {
    Swal.fire('Please log in to share posts', '', 'warning');
    return;
  }

  try {
    const postSnapshot = await database.ref(`posts/${id}`).once('value');
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
      mediaType: originalPost.mediaType,
      originalPostId: id,
      originalUserName: originalPost.userName,
      isShared: true
    };

    await database.ref('posts').push(sharedPost);
    await logActivity(`${contactPerson} from ${organization} shared a post`);
    Swal.fire('Success', 'Post shared successfully!', 'success');
  } catch (error) {
    console.error('Error sharing post:', error.code, error.message);
    Swal.fire('Error sharing post', `Failed to share post: ${error.message}`, 'error');
  }
}

async function loadPosts() {
  console.log('Loading posts from database');
  const postsContainer = document.getElementById('posts');
  if (!postsContainer) {
    console.error('Posts container not found');
    Swal.fire('Error', 'Posts container not found. Please try refreshing the page.', 'error');
    return;
  }

  database.ref('posts').orderByChild('timestamp').on('value', async (snapshot) => {
    postsContainer.innerHTML = '';
    const posts = snapshot.val();
    if (posts) {
      console.log('Posts retrieved:', Object.keys(posts).length);
      const postArray = Object.entries(posts).map(([id, post]) => ({ id, ...post }));
      postArray.sort((a, b) => b.timestamp - a.timestamp);

      for (const { id, ...post } of postArray) {
        console.log('Rendering post:', id, 'userName:', post.userName);
        const postElem = document.createElement('div');
        postElem.className = 'post';
        postElem.id = id;
        
        let mediaHtml = '';
        if (post.mediaUrl) {
          if (post.mediaType === 'image') {
            mediaHtml = `<img src="${post.mediaUrl}" class="post-media" alt="Post media" onerror="this.style.display='none'">`;
          } else if (post.mediaType === 'video') {
            mediaHtml = `<video src="${post.mediaUrl}" class="post-media" controls onerror="this.style.display='none'"></video>`;
          }
        }

        const canEdit = user && user.uid === post.userId;
        const isShared = post.isShared || false;
        const sharedInfo = isShared ? `<small class="shared-info">${post.originalUserName} shared this post</small>` : '';

        postElem.innerHTML = `
          <div class="post-header">
            <div class="post-user-info">
              <strong style="color: #121212">${post.userName}</strong>
              <div class="post-meta">
                <small style="color: var(--primary-color, #14AEBB); font-size: 0.9em;">${post.organization || ''}</small>
                <small>${new Date(post.timestamp).toLocaleString()}</small>
              </div>
              ${sharedInfo}
            </div>
            ${canEdit ? `
              <div class="post-menu">
                <button class="menu-button"><i class='bx bx-dots-vertical-rounded'></i></button>
                <div class="menu-dropdown" style="display: none;">
                  <button onclick="toggleEdit('${id}', '${post.userId}')">Edit</button>
                  <button onclick="deletePost('${id}')">Delete</button>
                </div>
              </div>
            ` : ''}
          </div>
          ${post.title ? `<h4 class="post-title">${post.title}</h4>` : ''}
          <p class="post-content" contenteditable="false">${post.content}</p>
          ${mediaHtml}
          <div class="post-actions">
            <button onclick="sharePost('${id}')"><i class='bx bx-share'></i> Share</button>
          </div>
        `;
        postsContainer.appendChild(postElem);

        // Add event listener for menu toggle
        if (canEdit) {
          const menuButton = postElem.querySelector('.menu-button');
          const menuDropdown = postElem.querySelector('.menu-dropdown');
          menuButton.addEventListener('click', () => {
            menuDropdown.style.display = menuDropdown.style.display === 'block' ? 'none' : 'block';
          });
          // Close dropdown when clicking outside
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
    console.error('Error loading posts:', error.code, error.message);
    Swal.fire('Error loading posts', `Failed to load posts: ${error.message}`, 'error');
    postsContainer.innerHTML = '<p>Error loading posts.</p>';
  });
}

async function toggleEdit(id, postUserId) {
  console.log('toggleEdit called for post:', id);
  const postElem = document.getElementById(id);
  if (!postElem) {
    console.error('Post element not found:', id);
    Swal.fire('Error', 'Post not found. Please try refreshing the page.', 'error');
    return;
  }

  if (!user || user.uid !== postUserId) {
    console.error('Unauthorized edit attempt for post:', id, 'by user:', user?.uid);
    Swal.fire('Error', 'You are not authorized to edit this post.', 'error');
    return;
  }

  const contentElem = postElem.querySelector('.post-content');
  const menuDropdown = postElem.querySelector('.menu-dropdown');
  if (!contentElem || !menuDropdown) {
    console.error('Post content or menu dropdown not found for post:', id);
    Swal.fire('Error', 'Post elements not found. Please try refreshing the page.', 'error');
    return;
  }

  if (contentElem.getAttribute('contenteditable') === 'true') {
    contentElem.setAttribute('contenteditable', 'false');
    menuDropdown.querySelector('button[onclick*="toggleEdit"]').textContent = 'Edit';
    try {
      console.log('Updating post content for:', id);
      await database.ref(`posts/${id}`).update({
        content: contentElem.textContent,
        editedTimestamp: firebase.database.ServerValue.TIMESTAMP
      });
      const { contactPerson, organization } = await fetchUserData(user.uid);
      await logActivity(`${contactPerson} from ${organization} edited a post`);
      console.log('Post updated successfully:', id);
      Swal.fire('Success', 'Post updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating post:', error.code, error.message);
      Swal.fire('Error updating post', `Failed to update post: ${error.message}`, 'error');
    }
  } else {
    contentElem.setAttribute('contenteditable', 'true');
    contentElem.focus();
    menuDropdown.querySelector('button[onclick*="toggleEdit"]').textContent = 'Save';
  }
}

async function deletePost(id) {
  console.log('deletePost called for post:', id);
  const post = (await database.ref(`posts/${id}`).once('value')).val();
  if (!user || user.uid !== post.userId) {
    console.error('Unauthorized delete attempt for post:', id, 'by user:', user?.uid);
    Swal.fire('Error', 'You are not authorized to delete this post.', 'error');
    return;
  }

  if (post && post.mediaUrl) {
    try {
      console.log('Deleting media:', post.mediaUrl);
      await storage.refFromURL(post.mediaUrl).delete();
      console.log('Media deleted successfully');
    } catch (error) {
      console.error('Error deleting media:', error.code, error.message);
    }
  }

  try {
    console.log('Removing post from database:', id);
    await database.ref(`posts/${id}`).remove();
    const { contactPerson, organization } = await fetchUserData(user.uid);
    await logActivity(`${contactPerson} from ${organization} deleted a post`);
    console.log('Post deleted successfully:', id);
  } catch (error) {
    console.error('Error deleting post:', error.code, error.message);
    Swal.fire('Error deleting post', `Failed to delete post: ${error.message}`, 'error');
  }
}

async function logActivity(message) {
  console.log('Logging activity:', message);
  if (!user) {
    console.error('No user logged in, cannot log activity');
    return;
  }
  try {
    await database.ref(`activity_log/${user.uid}`).push({
      message: message,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });
  } catch (error) {
    console.error('Error logging activity:', error.code, error.message);
  }
}

async function loadActivityLog() {
  console.log('Loading activity log from database');
  const log = document.getElementById('activity-log');
  if (!log) {
    console.error('Activity log container not found');
    return;
  }
  if (!user) {
    console.error('No user logged in, cannot load activity log');
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
    console.error('Error loading activity log:', error.code, error.message);
    log.innerHTML = '<p>Error loading activity.</p>';
  });
}

function setupModal() {
  const modal = document.getElementById('post-modal');
  const closeButton = document.querySelector('.close-button');
  const postButtons = document.querySelectorAll('.post-option');
  const modalPostContent = document.getElementById('modal-post-content');
  const mediaInput = document.getElementById('modal-media-upload');
  const mediaPreview = document.getElementById('modal-media-preview');

  function autoResizeTextarea() {
    modalPostContent.style.height = 'auto';
    const newHeight = Math.max(modalPostContent.scrollHeight, 80);
    modalPostContent.style.height = `${newHeight}px`;
    console.log('Textarea resized to:', newHeight, 'px');
  }

  let resizeTimeout;
  function debouncedResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(autoResizeTextarea, 50);
  }

  postButtons.forEach(button => {
    button.addEventListener('click', () => {
      postButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      const type = button.dataset.type;
      modal.style.display = 'block';
      
      if (type === 'image' || type === 'video') {
        mediaInput.accept = type === 'image' ? 'image/jpeg,image/png' : 'video/mp4,video/webm';
        mediaInput.click();
      } else if (type === 'link') {
        modalPostContent.placeholder = 'Paste your link here';
        modalPostContent.focus();
        autoResizeTextarea();
      } else {
        modalPostContent.placeholder = 'What\'s on your mind?';
        modalPostContent.focus();
        autoResizeTextarea();
      }
    });
  });

  closeButton.addEventListener('click', () => {
    modal.style.display = 'none';
    modalPostContent.value = '';
    document.getElementById('modal-post-title').value = '';
    modalPostContent.placeholder = 'What\'s on your mind?'; // Reset placeholder
    modalPostContent.style.height = '80px';
    mediaInput.value = '';
    mediaPreview.innerHTML = '';
  });

  mediaInput.addEventListener('change', (event) => {
    console.log('Media input changed');
    const file = event.target.files[0];
    mediaPreview.innerHTML = '';
    if (file) {
      if (!['image/jpeg', 'image/png', 'video/mp4', 'video/webm'].includes(file.type)) {
        console.log('Invalid file type selected:', file.type);
        Swal.fire('Unsupported file type', 'Please upload JPEG/PNG images or MP4/WebM videos', 'error');
        event.target.value = '';
        return;
      }
      console.log('Previewing file:', file.name);
      if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.className = 'media-preview';
        mediaPreview.appendChild(img);
      } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.className = 'media-preview';
        video.controls = true;
        mediaPreview.appendChild(video);
      }
    }
  });

  modalPostContent.addEventListener('input', debouncedResize);
  modalPostContent.addEventListener('focus', autoResizeTextarea);
  modalPostContent.addEventListener('change', autoResizeTextarea);
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded: Initializing dashboard');
  setupModal();
  
  if (typeof initializeDashboard === 'function') {
    initializeDashboard();
  } else {
    console.error('initializeDashboard function not found');
  }

  const postButton = document.getElementById('modal-post-button');
  if (postButton) {
    postButton.addEventListener('click', createPost);
  } else {
    console.error('Post button not found');
    Swal.fire('Error', 'Post button not found. Please try refreshing the page.', 'error');
  }
});

window.addEventListener('dashboard-loaded', () => {
  console.log('dashboard-loaded event: Initializing dashboard');
  if (typeof initializeDashboard === 'function') {
    initializeDashboard();
  } else {
    console.error('initializeDashboard function not found');
  }
});