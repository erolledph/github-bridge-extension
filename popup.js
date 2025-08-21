// GitHub Bridge Extension - Popup Script

class ExtensionApp {
  constructor() {
    this.currentScreen = 'loading';
    this.githubToken = null;
    this.selectedRepository = null;
    this.uploadedFile = null;
    this.extractedFiles = [];
    
    this.init();
  }

  async init() {
    console.log('Initializing GitHub Bridge Extension');
    
    // Add debugging for initial state
    console.log('Current screen on init:', this.currentScreen);
    console.log('Auth screen element:', document.getElementById('auth-screen'));
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Check for stored token
    await this.checkStoredToken();
  }

  setupEventListeners() {
    console.log('Setting up event listeners');

    // Authentication
    const authBtn = document.getElementById('auth-button');
    if (authBtn) authBtn.addEventListener('click', () => this.authenticate());

    const manualAuthBtn = document.getElementById('manual-auth-button');
    if (manualAuthBtn) manualAuthBtn.addEventListener('click', () => this.authenticateWithManualToken());

    // Manual token toggle buttons
    const showManualBtn = document.getElementById('show-manual-token-btn');
    if (showManualBtn) {
      showManualBtn.addEventListener('click', () => {
        console.log('Show manual token button clicked');
        this.toggleManualTokenSection();
      });
    }

    const backToOAuthBtn = document.getElementById('back-to-oauth-btn');
    if (backToOAuthBtn) {
      backToOAuthBtn.addEventListener('click', () => {
        console.log('Back to OAuth button clicked');
        this.toggleManualTokenSection();
      });
    }

    // Repository screen
    const repoBackBtn = document.getElementById('repo-back-btn');
    if (repoBackBtn) repoBackBtn.addEventListener('click', () => this.showScreen('auth'));

    const repoSearch = document.getElementById('repo-search');
    if (repoSearch) repoSearch.addEventListener('input', (e) => this.filterRepositories(e.target.value));

    const createRepoBtn = document.getElementById('create-repo-btn');
    if (createRepoBtn) createRepoBtn.addEventListener('click', () => this.toggleCreateForm());

    const cancelCreateBtn = document.getElementById('cancel-create-btn');
    if (cancelCreateBtn) cancelCreateBtn.addEventListener('click', () => this.toggleCreateForm());

    const confirmCreateBtn = document.getElementById('confirm-create-btn');
    if (confirmCreateBtn) confirmCreateBtn.addEventListener('click', () => this.createRepository());

    // Upload screen
    const uploadBackBtn = document.getElementById('upload-back-btn');
    if (uploadBackBtn) uploadBackBtn.addEventListener('click', () => this.showScreen('repo'));

    const browseBtn = document.getElementById('browse-btn');
    if (browseBtn) browseBtn.addEventListener('click', () => document.getElementById('file-input').click());

    const fileInput = document.getElementById('file-input');
    if (fileInput) fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    const continueUploadBtn = document.getElementById('continue-upload-btn');
    if (continueUploadBtn) continueUploadBtn.addEventListener('click', () => this.showScreen('commit'));

    // Commit screen
    const commitBackBtn = document.getElementById('commit-back-btn');
    if (commitBackBtn) commitBackBtn.addEventListener('click', () => this.showScreen('upload'));

    const commitMsg = document.getElementById('commit-message');
    if (commitMsg) commitMsg.addEventListener('input', (e) => this.updateCharCount(e.target.value));

    const clearExisting = document.getElementById('clear-existing');
    if (clearExisting) clearExisting.addEventListener('change', (e) => this.toggleClearWarning(e.target.checked));

    const pushBtn = document.getElementById('push-btn');
    if (pushBtn) pushBtn.addEventListener('click', () => this.pushToRepository());

    // Success screen
    const viewGithubBtn = document.getElementById('view-github-btn');
    if (viewGithubBtn) viewGithubBtn.addEventListener('click', () => this.viewOnGitHub());

    const startOverBtn = document.getElementById('start-over-btn');
    if (startOverBtn) startOverBtn.addEventListener('click', () => this.startOver());

    // External link in footer
    const externalLink = document.getElementById('external-link');
    if (externalLink) externalLink.addEventListener('click', (e) => this.handleExternalLink(e));

    // Drop zone
    const dropZone = document.getElementById('drop-zone');
    if (dropZone) {
      dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
      dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
      dropZone.addEventListener('drop', (e) => this.handleDrop(e));
    }
  }

  async checkStoredToken() {
    console.log('Checking stored token...');
    try {
      const response = await this.sendMessage({ action: 'getStoredToken' });
      console.log('Stored token response:', response);
      
      if (response.success && response.token) {
        console.log('Found stored token, validating...');
        this.githubToken = response.token;
        
        // Validate the stored token
        const validation = await this.sendMessage({ 
          action: 'validateToken', 
          token: this.githubToken 
        });
        
        console.log('Token validation result:', validation);
        
        if (validation.success && validation.validation.valid) {
          console.log('Token is valid, proceeding to repo screen');
          this.showScreen('repo');
          this.loadRepositories();
        } else {
          console.log('Token validation failed, showing auth screen');
          this.showError('auth-error', 'GitHub Token Validation Failed or Token expired\n\nYour GitHub token could not be validated. This may happen if the token has expired, been revoked, or lost required permissions. Please logout and login again to refresh your authentication.');
          this.showScreen('auth');
        }
      } else {
        console.log('No stored token found, showing auth screen');
        this.showScreen('auth');
      }
    } catch (error) {
      console.error('Error checking stored token:', error);
      this.showError('auth-error', 'GitHub Token Validation Failed or Token expired\n\nYour GitHub token could not be validated. This may happen if the token has expired, been revoked, or lost required permissions. Please logout and login again to refresh your authentication.');
      this.showScreen('auth');
    }
  }

  async authenticate() {
    return this.authenticateWithOAuth();
  }

  toggleManualTokenSection() {
    console.log('Toggling manual token section');
    
    const authOptions = document.getElementById('auth-options');
    const manualTokenSection = document.querySelector('.manual-token-section');
    const errorDiv = document.getElementById('auth-error');
    
    console.log('Auth options element:', authOptions);
    console.log('Manual token section element:', manualTokenSection);
    
    if (!authOptions || !manualTokenSection) {
      console.error('Required elements not found for toggle');
      return;
    }
    
    // Toggle visibility of both sections
    authOptions.classList.toggle('hidden');
    manualTokenSection.classList.toggle('hidden');
    
    console.log('Auth options hidden:', authOptions.classList.contains('hidden'));
    console.log('Manual token section hidden:', manualTokenSection.classList.contains('hidden'));
    
    // Clear any existing errors
    errorDiv.classList.add('hidden');
    
    // If showing manual token section, focus on the input
    if (!manualTokenSection.classList.contains('hidden')) {
      const tokenInput = document.getElementById('manual-token');
      if (tokenInput) {
        setTimeout(() => {
          tokenInput.focus();
          console.log('Focused on token input');
        }, 100);
      }
    } else {
      // Clear the token input when going back
      const tokenInput = document.getElementById('manual-token');
      if (tokenInput) {
        tokenInput.value = '';
      }
    }
  }

  async authenticateWithOAuth() {
    const authButton = document.getElementById('auth-button');
    const errorDiv = document.getElementById('auth-error');
    
    authButton.disabled = true;
    authButton.innerHTML = `
      <div class="spinner spinner--light"></div>
      Signing in...
    `;
    errorDiv.classList.add('hidden');
    
    try {
      const response = await this.sendMessage({ action: 'authenticate' });
      
      if (response.success) {
        this.githubToken = response.token;
        this.showScreen('repo');
        this.loadRepositories();
      } else {
        throw new Error(response.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      errorDiv.textContent = error.message;
      errorDiv.classList.remove('hidden');
    } finally {
      authButton.disabled = false;
      authButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
        Sign in with GitHub
      `;
    }
  }

  async authenticateWithManualToken() {
    console.log('Starting manual token authentication');
    
    const tokenInput = document.getElementById('manual-token');
    const authButton = document.getElementById('manual-auth-button');
    const errorDiv = document.getElementById('auth-error');
    
    const token = tokenInput.value.trim();
    console.log('Token length:', token.length);
    console.log('Token starts with ghp_:', token.startsWith('ghp_'));
    console.log('Token starts with github_pat_:', token.startsWith('github_pat_'));
    
    if (!token) {
      console.log('No token provided');
      errorDiv.textContent = 'Please enter a GitHub Personal Access Token';
      errorDiv.classList.remove('hidden');
      tokenInput.focus();
      return;
    }
    
    if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
      console.log('Invalid token format');
      errorDiv.textContent = 'Invalid token format. GitHub tokens should start with "ghp_" or "github_pat_"';
      errorDiv.classList.remove('hidden');
      tokenInput.focus();
      return;
    }
    
    console.log('Validating token...');
    authButton.disabled = true;
    authButton.innerHTML = `
      <div></div>
      Validating...
    `;
    errorDiv.classList.add('hidden');
    
    try {
      const validation = await this.sendMessage({ 
        action: 'validateToken', 
        token: token 
      });
      
      console.log('Manual token validation result:', validation);
      
      if (validation.success && validation.validation.valid) {
        console.log('Manual token is valid, storing and proceeding');
        // Store the token
        await this.sendMessage({ 
          action: 'storeToken', 
          token: token 
        });
        
        this.githubToken = token;
        this.showScreen('repo');
        this.loadRepositories();
      } else {
        console.log('Manual token validation failed');
        this.showError('auth-error', 'GitHub Token Validation Failed or Token expired\n\nYour GitHub token could not be validated. This may happen if the token has expired, been revoked, or lost required permissions. Please logout and login again to refresh your authentication.');
        return;
      }
    } catch (error) {
      console.error('Manual authentication error:', error);
      this.showError('auth-error', 'GitHub Token Validation Failed or Token expired\n\nYour GitHub token could not be validated. This may happen if the token has expired, been revoked, or lost required permissions. Please logout and login again to refresh your authentication.');
    } finally {
      authButton.disabled = false;
      authButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
        Authenticate
      `;
    }
  }

  async loadRepositories() {
    const repoList = document.getElementById('repo-list');
    repoList.innerHTML = `
      <div class="loading-repos">
        <div class="spinner"></div>
        <p>Loading repositories...</p>
      </div>
    `;
    
    try {
      const response = await this.sendMessage({ 
        action: 'getRepositories', 
        token: this.githubToken 
      });
      
      if (response.success) {
        this.repositories = response.repositories;
        this.renderRepositories(this.repositories);
      } else {
        throw new Error(response.error || 'Failed to load repositories');
      }
    } catch (error) {
      console.error('Error loading repositories:', error);
      repoList.innerHTML = `
        <div class="error-state">
          <p>Failed to load repositories: ${error.message}</p>
          <button id="retry-load-repos" class="btn-secondary">Try Again</button>
        </div>
      `;
      
      // Attach event listener to retry button
      const retryButton = document.getElementById('retry-load-repos');
      if (retryButton) {
        retryButton.addEventListener('click', () => this.loadRepositories());
      }
    }
  }

  renderRepositories(repositories) {
    const repoList = document.getElementById('repo-list');
    
    if (repositories.length === 0) {
      repoList.innerHTML = `
        <div class="empty-state">
          <p>No repositories found</p>
        </div>
      `;
      return;
    }
    
    repoList.innerHTML = repositories.map(repo => `
      <div class="repo-item" data-repo-id="${repo.id}">
        <div class="repo-info">
          <div class="repo-header">
            <h3>${repo.name}</h3>
            <span class="repo-visibility">
              ${repo.private ? 
                '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><circle cx="12" cy="7" r="4"/></svg> Private' : 
                '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/></svg> Public'
              }
            </span>
          </div>
          <small class="repo-updated">Updated ${new Date(repo.updated_at).toLocaleDateString()}</small>
        </div>
      </div>
    `).join('');
    
    // Add click listeners
    document.querySelectorAll('.repo-item').forEach(item => {
      item.addEventListener('click', () => {
        const repoId = parseInt(item.dataset.repoId);
        const repo = repositories.find(r => r.id === repoId);
        this.selectRepository(repo);
      });
    });
  }

  filterRepositories(searchTerm) {
    if (!this.repositories) return;
    
    const filtered = this.repositories.filter(repo => 
      repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (repo.description && repo.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    this.renderRepositories(filtered);
  }

  toggleCreateForm() {
    const form = document.getElementById('create-repo-form');
    form.classList.toggle('hidden');
    
    if (!form.classList.contains('hidden')) {
      document.getElementById('repo-name').focus();
    } else {
      // Clear form
      document.getElementById('repo-name').value = '';
      document.getElementById('repo-description').value = '';
      document.getElementById('repo-private').checked = false;
      document.getElementById('create-error').classList.add('hidden');
    }
  }

  async createRepository() {
    const name = document.getElementById('repo-name').value.trim();
    const description = document.getElementById('repo-description').value.trim();
    const isPrivate = document.getElementById('repo-private').checked;
    const errorDiv = document.getElementById('create-error');
    const createBtn = document.getElementById('confirm-create-btn');
    
    if (!name) {
      errorDiv.textContent = 'Repository name is required';
      errorDiv.classList.remove('hidden');
      return;
    }
    
    createBtn.disabled = true;
    createBtn.innerHTML = `
      <div class="spinner-small"></div>
      Creating...
    `;
    errorDiv.classList.add('hidden');
    
    try {
      const response = await this.sendMessage({
        action: 'createRepository',
        token: this.githubToken,
        name,
        description: description || undefined,
        isPrivate
      });
      
      if (response.success) {
        this.selectRepository(response.repository);
        this.toggleCreateForm();
      } else {
        throw new Error(response.error || 'Failed to create repository');
      }
    } catch (error) {
      console.error('Error creating repository:', error);
      errorDiv.textContent = error.message;
      errorDiv.classList.remove('hidden');
    } finally {
      createBtn.disabled = false;
      createBtn.innerHTML = 'Create Repository';
    }
  }

  selectRepository(repository) {
    this.selectedRepository = repository;
    this.showScreen('upload');
  }

  handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('drop-zone').classList.add('drag-over');
  }

  handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('drop-zone').classList.remove('drag-over');
  }

  handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('drop-zone').classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      this.processFile(files[0]);
    }
  }

  handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
      this.processFile(files[0]);
    }
  }

  async processFile(file) {
    if (!file.name.endsWith('.zip')) {
      this.showError('upload-error', 'Please upload a ZIP file');
      return;
    }
    
    const dropZone = document.getElementById('drop-zone');
    dropZone.innerHTML = `
      <div class="processing">
        <div class="spinner"></div>
        <p>Processing ZIP file...</p>
      </div>
    `;
    
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      
      const extractedFiles = [];
      const allPaths = Object.keys(zipContent.files).filter(path => !zipContent.files[path].dir);
      
      // Find common root folder
      let commonRoot = '';
      if (allPaths.length > 0) {
        const firstPath = allPaths[0];
        const pathParts = firstPath.split('/');
        
        if (pathParts.length > 1) {
          const potentialRoot = pathParts[0] + '/';
          const allHaveSameRoot = allPaths.every(path => path.startsWith(potentialRoot));
          
          if (allHaveSameRoot) {
            commonRoot = potentialRoot;
          }
        }
      }
      
      // Process each file
      for (const [relativePath, zipEntry] of Object.entries(zipContent.files)) {
        if (!zipEntry.dir) {
          let finalPath = relativePath;
          if (commonRoot && relativePath.startsWith(commonRoot)) {
            finalPath = relativePath.substring(commonRoot.length);
          }
          
          if (!finalPath) continue;
          
          try {
            const content = await zipEntry.async('string');
            extractedFiles.push({
              path: finalPath,
              content: content,
              isDirectory: false
            });
          } catch {
            const content = await zipEntry.async('uint8array');
            extractedFiles.push({
              path: finalPath,
              content: content,
              isDirectory: false
            });
          }
        }
      }
      
      this.uploadedFile = {
        name: file.name,
        size: file.size,
        extractedFiles: extractedFiles
      };
      
      this.showFilePreview();
      
    } catch (error) {
      console.error('Error processing file:', error);
      
      // Log detailed error information for debugging
      console.error('ZIP processing error details:', {
        errorMessage: error.message,
        errorStack: error.stack,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileLastModified: new Date(file.lastModified).toISOString()
      });
      
      // Provide more specific error messages based on the error type
      let errorMessage = 'Failed to process ZIP file. Please ensure it\'s a valid ZIP archive.';
      
      if (error && error.message && typeof error.message === 'string' && error.message.includes('End of central directory not found')) {
        errorMessage = 'The file appears to be corrupted or incomplete. Please try re-downloading and uploading the ZIP file.';
      } else if (error && error.message && typeof error.message === 'string' && error.message.includes('Invalid signature')) {
        errorMessage = 'The file is not a valid ZIP archive. Please ensure you\'re uploading a .zip file.';
      } else if (error && error.message && typeof error.message === 'string' && error.message.includes('Encrypted zip are not supported')) {
        errorMessage = 'Password-protected ZIP files are not supported. Please upload an unencrypted ZIP file.';
      } else if (error && error.name === 'TypeError' && error.message && typeof error.message === 'string' && error.message.includes('Cannot read')) {
        errorMessage = 'Unable to read the ZIP file. The file may be corrupted or in an unsupported format.';
      } else if (file.size === 0) {
        errorMessage = 'The uploaded file is empty. Please select a valid ZIP file.';
      } else if (file.size > 100 * 1024 * 1024) { // 100MB limit
        errorMessage = 'The ZIP file is too large. Please upload a file smaller than 100MB.';
      }
      
      this.showError('upload-error', errorMessage);
      this.resetDropZone();
    }
  }

  showFilePreview() {
    const preview = document.getElementById('file-preview');
    const fileInfo = document.getElementById('file-info');
    const fileList = document.getElementById('file-list');
    
    fileInfo.innerHTML = `
      <div class="file-details">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
        </svg>
        <div>
          <h4>${this.uploadedFile.name}</h4>
          <p>${(this.uploadedFile.size / 1024 / 1024).toFixed(2)} MB • ${this.uploadedFile.extractedFiles.length} files</p>
        </div>
      </div>
    `;
    
    const filesToShow = this.uploadedFile.extractedFiles.slice(0, 10);
    fileList.innerHTML = `
      <div class="file-items">
        ${filesToShow.map(file => `
          <div class="file-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            </svg>
            <span>${file.path}</span>
          </div>
        `).join('')}
        ${this.uploadedFile.extractedFiles.length > 10 ? 
          `<p class="more-files">... and ${this.uploadedFile.extractedFiles.length - 10} more files</p>` : 
          ''
        }
      </div>
    `;
    
    document.getElementById('drop-zone').classList.add('hidden');
    preview.classList.remove('hidden');
  }

  resetDropZone() {
    const dropZone = document.getElementById('drop-zone');
    dropZone.classList.remove('hidden');
    dropZone.innerHTML = `
      <div class="drop-content">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7,10 12,15 17,10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <h3>Drop your ZIP file here</h3>
        <p>or <button id="browse-btn" class="link-btn">click to browse</button></p>
        <small>Supports ZIP files exported from Bolt.new</small>
      </div>
    `;
    
    document.getElementById('file-preview').classList.add('hidden');
    
    // Re-attach the browse button event listener
    const browseBtn = document.getElementById('browse-btn');
    if (browseBtn) {
      browseBtn.addEventListener('click', () => {
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
          fileInput.click();
        }
      });
    }
  }

  async showCommitScreen() {
    // Show loading state for file changes
    const fileChangesList = document.getElementById('file-changes-list');
    fileChangesList.innerHTML = `
      <div class="loading-changes">
        <div class="spinner"></div>
        <p>Analyzing file changes...</p>
      </div>
    `;

    // Set up repository info
    const repoInfo = document.getElementById('repo-info');
    repoInfo.innerHTML = `
      <div class="selected-repo">
        <img src="${this.selectedRepository.owner.avatar_url}" alt="${this.selectedRepository.owner.login}" class="repo-avatar">
        <div>
          <h3>${this.selectedRepository.full_name}</h3>
          <p>${this.uploadedFile.extractedFiles.length} files to upload</p>
        </div>
      </div>
    `;
    
    // Set default commit message
    const commitMessage = document.getElementById('commit-message');
    commitMessage.value = `Upload project from Bolt.new: ${this.uploadedFile.name.replace('.zip', '')}`;
    this.updateCharCount(commitMessage.value);
    
    // Load branches
    await this.loadBranches();
    
    // Analyze file changes
    await this.analyzeFileChanges();
  }

  async analyzeFileChanges() {
    console.log('Starting analyzeFileChanges...');
    try {
      const selectedBranch = document.getElementById('branch-select').value || this.selectedRepository.default_branch;
      console.log('Selected branch:', selectedBranch);
      
      // Get branch details
      console.log('Fetching branch details...');
      const branchResponse = await this.sendMessage({
        action: 'getBranchDetails',
        token: this.githubToken,
        owner: this.selectedRepository.owner.login,
        repo: this.selectedRepository.name,
        branch: selectedBranch
      });
      console.log('Branch details response:', branchResponse);
      
      if (!branchResponse.success) {
        throw new Error(branchResponse.error);
      }
      
      // Get existing file tree
      console.log('Fetching file tree...');
      const treeResponse = await this.sendMessage({
        action: 'getTree',
        token: this.githubToken,
        owner: this.selectedRepository.owner.login,
        repo: this.selectedRepository.name,
        sha: branchResponse.branchDetails.commit.sha,
        recursive: true
      });
      console.log('Tree response received, tree items count:', treeResponse.success ? treeResponse.tree.tree.length : 'failed');
      
      if (!treeResponse.success) {
        throw new Error(treeResponse.error);
      }
      
      // Compare files
      console.log('Starting file comparison...');
      await this.compareFiles(treeResponse.tree.tree);
      console.log('File comparison completed');
      
    } catch (error) {
      console.error('Error analyzing file changes:', error);
      const fileChangesList = document.getElementById('file-changes-list');
      fileChangesList.innerHTML = `
        <div class="error-state">
          <p>Failed to analyze file changes: ${error.message}</p>
          <p>You can still proceed with the upload.</p>
        </div>
      `;
    }
  }

  async compareFiles(existingTree) {
    console.log('Starting compareFiles with', existingTree.length, 'existing files');
    const existingFiles = new Map();
    const uploadedFiles = new Map();
    
    // Map existing files (only blobs, not trees)
    existingTree
      .filter(item => item.type === 'blob')
      .forEach(item => {
        existingFiles.set(item.path, item);
      });
    console.log('Mapped', existingFiles.size, 'existing files');
    
    // Map uploaded files
    this.uploadedFile.extractedFiles.forEach(file => {
      uploadedFiles.set(file.path, file);
    });
    console.log('Mapped', uploadedFiles.size, 'uploaded files');
    
    const changes = {
      new: [],
      modified: [],
      deleted: [],
      unchanged: []
    };
    
    // Helper function to normalize line endings and whitespace for comparison
    const normalizeContent = (content) => {
      if (typeof content !== 'string') {
        return content;
      }
      // Normalize line endings to LF and trim trailing whitespace from each line
      return content
        .replace(/\r\n/g, '\n')  // Convert CRLF to LF
        .replace(/\r/g, '\n')    // Convert CR to LF
        .split('\n')
        .map(line => line.trimEnd()) // Remove trailing whitespace from each line
        .join('\n')
        .replace(/\n+$/, '') // Remove trailing blank lines
        .trim(); // Remove leading/trailing whitespace from entire content
    };
    
    let processedCount = 0;
    // Check uploaded files against existing
    for (const [path, uploadedFile] of uploadedFiles) {
      processedCount++;
      console.log(`Processing file ${processedCount}/${uploadedFiles.size}: ${path}`);
      
      if (!existingFiles.has(path)) {
        // New file
        console.log(`File ${path} is new`);
        changes.new.push({ path, file: uploadedFile, status: 'new' });
      } else {
        // File exists, check if modified
        const existingFile = existingFiles.get(path);
        console.log(`Comparing existing file ${path}...`);
        try {
          console.log(`Fetching content for ${path} (sha: ${existingFile.sha})`);
          const existingContentResponse = await this.sendMessage({
            action: 'getBlobContent',
            token: this.githubToken,
            owner: this.selectedRepository.owner.login,
            repo: this.selectedRepository.name,
            sha: existingFile.sha
          });
          console.log(`Content fetch response for ${path}:`, existingContentResponse.success ? 'success' : 'failed');
          
          if (existingContentResponse.success) {
            const existingContent = normalizeContent(existingContentResponse.content);
            const uploadedContent = typeof uploadedFile.content === 'string' 
              ? normalizeContent(uploadedFile.content)
              : normalizeContent(new TextDecoder().decode(uploadedFile.content));
            
            console.log(`Comparing file: ${path}`);
            console.log(`Existing content length: ${existingContent.length}`);
            console.log(`Uploaded content length: ${uploadedContent.length}`);
            
            if (existingContent === uploadedContent) {
              console.log(`File ${path} is unchanged`);
              changes.unchanged.push({ path, file: uploadedFile, status: 'unchanged' });
            } else {
              console.log(`File ${path} is modified`);
              changes.modified.push({ path, file: uploadedFile, status: 'modified' });
            }
          } else {
            // If we can't fetch content, assume modified
            console.log(`Could not fetch content for ${path}, assuming modified`);
            changes.modified.push({ path, file: uploadedFile, status: 'modified' });
          }
        } catch (error) {
          console.error(`Error comparing file ${path}:`, error);
          // If comparison fails, assume modified
          changes.modified.push({ path, file: uploadedFile, status: 'modified' });
        }
      }
      
      // Add a small delay to prevent overwhelming the API and allow UI updates
      if (processedCount % 10 === 0) {
        console.log(`Processed ${processedCount} files, taking a brief pause...`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('Checking for deleted files...');
    // Check for deleted files
    for (const [path, existingFile] of existingFiles) {
      if (!uploadedFiles.has(path)) {
        console.log(`File ${path} will be deleted`);
        changes.deleted.push({ path, file: existingFile, status: 'deleted' });
      }
    }
    
    console.log('File changes summary:', {
      new: changes.new.length,
      modified: changes.modified.length,
      deleted: changes.deleted.length,
      unchanged: changes.unchanged.length
    });
    
    this.fileChangesSummary = changes;
    
    // Initialize selected files (all new, modified, and unchanged selected by default)
    this.filesToPush = [
      ...changes.new.map(item => item.file),
      ...changes.modified.map(item => item.file),
      ...changes.unchanged.map(item => item.file)
    ];
    
    // Initialize files to delete (none selected by default)
    this.filesToDelete = changes.deleted.map(item => item.path);
    
    console.log('Rendering file changes summary...');
    this.renderFileChangesSummary();
    console.log('File changes summary rendered');
  }

  renderFileChangesSummary() {
    const fileChangesList = document.getElementById('file-changes-list');
    const changes = this.fileChangesSummary;
    
    const totalChanges = changes.new.length + changes.modified.length + changes.deleted.length;
    
    if (totalChanges === 0 && changes.unchanged.length === 0) {
      fileChangesList.innerHTML = `
        <div class="empty-state">
          <p>No files to compare</p>
        </div>
      `;
      return;
    }
    
    const categories = [
      { key: 'new', label: 'New files', items: changes.new },
      { key: 'modified', label: 'Modified files', items: changes.modified },
      { key: 'deleted', label: 'Deleted files', items: changes.deleted },
      { key: 'unchanged', label: 'Unchanged files', items: changes.unchanged }
    ].filter(category => category.items.length > 0);
    
    const categorizedContent = categories.map(category => this.renderCategory(category)).join('');
    
    fileChangesList.innerHTML = categorizedContent;
    
    // Attach event listeners after DOM elements are created
    this.attachFileChangeListeners();
  }

  renderCategory(category) {
    const { key, label, items, icon } = category;
    const sortedItems = items.sort((a, b) => a.path.localeCompare(b.path));
    
    const toggleIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M9 18l6-6-6-6"/>
    </svg>`;
    
    const fileItems = sortedItems.map(item => {
      const isSelected = this.isFileSelected(item);
      
      return `
        <div class="file-change-item">
          <input type="checkbox" 
                 ${isSelected ? 'checked' : ''} 
                 data-path="${item.path}" 
                 data-status="${item.status}"
                 onchange="app.handleFileSelectionChange(this)">
          <span class="file-path" title="${item.path}">${item.path}</span>
        </div>
      `;
    }).join('');
    
    return `
      <div class="file-category-section" data-category="${key}">
        <div class="file-category-header" data-category-key="${key}">
          <span class="category-toggle-icon">${toggleIcon}</span>
          <span class="category-title">${items.length} ${label}</span>
        </div>
        <div class="file-category-items">
          ${fileItems}
        </div>
      </div>
    `;
  }

  getCategoryIcon(iconType) {
    switch (iconType) {
      case 'plus':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14"/>
          <path d="M5 12h14"/>
        </svg>`;
      case 'edit':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>
        </svg>`;
      case 'trash':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"/>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>`;
      case 'check':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 6L9 17l-5-5"/>
        </svg>`;
      default:
        return '';
    }
  }

  getStatusIcon(status) {
    switch (status) {
      case 'new':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14"/>
          <path d="M5 12h14"/>
        </svg>`;
      case 'modified':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>
        </svg>`;
      case 'deleted':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"/>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>`;
      case 'unchanged':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 6L9 17l-5-5"/>
        </svg>`;
      default:
        return '';
    }
  }

  isFileSelected(item) {
    if (item.status === 'deleted') {
      return this.filesToDelete.includes(item.path);
    } else {
      return this.filesToPush.some(file => file.path === item.path);
    }
  }

  handleFileSelectionChange(checkbox) {
    const path = checkbox.dataset.path;
    const status = checkbox.dataset.status;
    const isChecked = checkbox.checked;
    
    if (status === 'deleted') {
      if (isChecked) {
        if (!this.filesToDelete.includes(path)) {
          this.filesToDelete.push(path);
        }
      } else {
        this.filesToDelete = this.filesToDelete.filter(p => p !== path);
      }
    } else {
      if (isChecked) {
        // Find the file in the changes and add to filesToPush
        const allFiles = [
          ...this.fileChangesSummary.new,
          ...this.fileChangesSummary.modified,
          ...this.fileChangesSummary.unchanged
        ];
        const fileItem = allFiles.find(item => item.path === path);
        if (fileItem && !this.filesToPush.some(file => file.path === path)) {
          this.filesToPush.push(fileItem.file);
        }
      } else {
        this.filesToPush = this.filesToPush.filter(file => file.path !== path);
      }
    }
  }

  toggleCategory(categoryKey) {
    const categorySection = document.querySelector(`.file-category-section[data-category="${categoryKey}"]`);
    if (categorySection) {
      categorySection.classList.toggle('expanded');
    }
  }

  attachFileChangeListeners() {
    // Attach click listeners to category headers
    const categoryHeaders = document.querySelectorAll('.file-category-header');
    categoryHeaders.forEach(header => {
      header.addEventListener('click', (event) => {
        const categoryKey = header.getAttribute('data-category-key');
        if (categoryKey) {
          this.toggleCategory(categoryKey);
        }
      });
    });
    
    // Attach change listeners to file checkboxes
    const fileCheckboxes = document.querySelectorAll('.file-change-item input[type="checkbox"]');
    fileCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (event) => {
        this.handleFileSelectionChange(event.target);
      });
    });
  }

  async loadBranches() {
    const branchSelect = document.getElementById('branch-select');
    branchSelect.innerHTML = '<option value="">Loading branches...</option>';
    
    try {
      const response = await this.sendMessage({
        action: 'getBranches',
        token: this.githubToken,
        owner: this.selectedRepository.owner.login,
        repo: this.selectedRepository.name
      });
      
      if (response.success) {
        const branches = response.branches;
        branchSelect.innerHTML = branches.map(branch => 
          `<option value="${branch}" ${branch === this.selectedRepository.default_branch ? 'selected' : ''}>${branch}</option>`
        ).join('');
      } else {
        branchSelect.innerHTML = `<option value="${this.selectedRepository.default_branch}">${this.selectedRepository.default_branch}</option>`;
      }
    } catch (error) {
      console.error('Error loading branches:', error);
      branchSelect.innerHTML = `<option value="${this.selectedRepository.default_branch}">${this.selectedRepository.default_branch}</option>`;
    }
  }

  updateCharCount(message) {
    const charCount = document.querySelector('.char-count');
    charCount.textContent = `${message.length}/72 characters (recommended)`;
    charCount.className = `char-count ${message.length > 72 ? 'over-limit' : ''}`;
  }

  toggleClearWarning(show) {
    const warning = document.getElementById('clear-warning');
    warning.classList.toggle('hidden', !show);
  }

  async pushToRepository() {
    const commitMessage = document.getElementById('commit-message').value.trim();
    const selectedBranch = document.getElementById('branch-select').value;
    const clearExisting = document.getElementById('clear-existing').checked;
    const pushBtn = document.getElementById('push-btn');
    const errorDiv = document.getElementById('commit-error');
    
    if (!commitMessage) {
      this.showError('commit-error', 'Please enter a commit message');
      return;
    }
    
    pushBtn.disabled = true;
    errorDiv.classList.add('hidden');
    
    const progressDiv = document.getElementById('upload-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressPercent = document.getElementById('progress-percent');
    
    progressDiv.classList.remove('hidden');
    
    try {
      // When clearing existing files, use all files from the ZIP
      // Otherwise, use only the selected files for selective update
      const filesToUpload = clearExisting ? this.uploadedFile.extractedFiles : this.filesToPush;
      
      const response = await this.sendMessage({
        action: 'uploadFiles',
        token: this.githubToken,
        repository: this.selectedRepository,
        files: filesToUpload,
        filesToDeletePaths: this.filesToDelete,
        commitInfo: {
          message: commitMessage,
          branch: selectedBranch,
          clearExisting: clearExisting
        }
      });
      
      if (response.success) {
        this.showScreen('success');
      } else {
        throw new Error(response.error || 'Failed to upload files');
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      this.showError('commit-error', error.message);
      progressDiv.classList.add('hidden');
    } finally {
      pushBtn.disabled = false;
    }
  }

  viewOnGitHub() {
    const branch = document.getElementById('branch-select').value;
    const url = `${this.selectedRepository.html_url}/tree/${branch}`;
    chrome.tabs.create({ url });
  }

  handleExternalLink(e) {
    e.preventDefault();
    const url = e.target.href;
    chrome.tabs.create({ url });
  }

  startOver() {
    this.selectedRepository = null;
    this.uploadedFile = null;
    this.extractedFiles = [];
    this.fileChangesSummary = null;
    this.filesToPush = [];
    this.filesToDelete = [];
    this.showScreen('repo');
  }

  showScreen(screenName) {
    console.log('Showing screen:', screenName);
    
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.add('hidden');
    });
    
    // Show target screen
    const targetScreen = document.getElementById(`${screenName}-screen`);
    if (targetScreen) {
      targetScreen.classList.remove('hidden');
      console.log('Successfully showed screen:', screenName);
    } else {
      console.error('Screen not found:', `${screenName}-screen`);
    }
    
    this.currentScreen = screenName;
    
    // Special handling for certain screens
    if (screenName === 'commit') {
      this.showCommitScreen();
    } else if (screenName === 'success') {
      const successMessage = document.getElementById('success-message');
      if (successMessage && this.selectedRepository) {
        successMessage.textContent = `Your project has been successfully uploaded to ${this.selectedRepository.full_name}`;
      }
    }
  }

  showError(elementId, message) {
    const errorDiv = document.getElementById(elementId);
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
  }

  async sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }

  async loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
}

// Listen for progress updates from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'uploadProgress') {
    const progressFill = document.getElementById('progress-fill');
    const progressPercent = document.getElementById('progress-percent');
    
    if (progressFill && progressPercent) {
      progressFill.style.width = `${message.progress}%`;
      progressPercent.textContent = `${message.progress}%`;
    }
  }
});

// Initialize the app after DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new ExtensionApp();
  
  // Make app globally available for event handlers that need it
  window.app = app;
});

// Fallback initialization if DOMContentLoaded has already fired
if (document.readyState === 'loading') {
  // DOM is still loading, wait for DOMContentLoaded
} else {
  // DOM is already loaded, initialize immediately
  const app = new ExtensionApp();
  window.app = app;
}