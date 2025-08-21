// GitHub Bridge Extension - Popup Script

class GitHubBridge {
  constructor() {
    this.token = null;
    this.selectedRepository = null;
    this.uploadedFiles = [];
    this.filesToPush = [];
    this.existingFiles = new Map();
    
    this.init();
  }

  async init() {
    this.showScreen('loading-screen');
    await this.checkAuthentication();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Authentication
    document.getElementById('manual-auth-button').addEventListener('click', () => this.authenticateWithToken());
    
    // Repository selection
    document.getElementById('repo-back-btn').addEventListener('click', () => this.showScreen('auth-screen'));
    document.getElementById('repo-search').addEventListener('input', (e) => this.filterRepositories(e.target.value));
    document.getElementById('create-repo-btn').addEventListener('click', () => this.showCreateRepoForm());
    document.getElementById('cancel-create-btn').addEventListener('click', () => this.hideCreateRepoForm());
    document.getElementById('confirm-create-btn').addEventListener('click', () => this.createRepository());
    
    // File upload
    document.getElementById('upload-back-btn').addEventListener('click', () => this.showScreen('repo-screen'));
    document.getElementById('browse-btn').addEventListener('click', () => document.getElementById('file-input').click());
    document.getElementById('file-input').addEventListener('change', (e) => this.handleFileSelect(e.target.files[0]));
    document.getElementById('continue-upload-btn').addEventListener('click', () => this.proceedToCommit());
    
    // Drag and drop
    const dropZone = document.getElementById('drop-zone');
    dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
    dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    dropZone.addEventListener('drop', (e) => this.handleDrop(e));
    
    // Commit
    document.getElementById('commit-back-btn').addEventListener('click', () => this.showScreen('upload-screen'));
    document.getElementById('commit-message').addEventListener('input', (e) => this.updateCharCount(e.target.value));
    document.getElementById('clear-existing').addEventListener('change', (e) => this.toggleClearWarning(e.target.checked));
    document.getElementById('push-btn').addEventListener('click', () => this.pushToRepository());
    
    // Success
    document.getElementById('view-github-btn').addEventListener('click', () => this.viewOnGitHub());
    document.getElementById('start-over-btn').addEventListener('click', () => this.startOver());
  }

  async checkAuthentication() {
    try {
      const response = await this.sendMessage({ action: 'getStoredToken' });
      if (response.success && response.token) {
        this.token = response.token;
        const validation = await this.validateToken(this.token);
        if (validation.valid) {
          this.showScreen('repo-screen');
          await this.loadRepositories();
        } else {
          this.showScreen('auth-screen');
        }
      } else {
        this.showScreen('auth-screen');
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      this.showScreen('auth-screen');
    }
  }

  async authenticateWithToken() {
    const tokenInput = document.getElementById('manual-token');
    const token = tokenInput.value.trim();
    const errorDiv = document.getElementById('auth-error');
    
    if (!token) {
      this.showError(errorDiv, 'Please enter a GitHub token');
      return;
    }

    try {
      const validation = await this.validateToken(token);
      if (validation.valid) {
        await this.sendMessage({ action: 'storeToken', token });
        this.token = token;
        this.showScreen('repo-screen');
        await this.loadRepositories();
      } else {
        this.showError(errorDiv, 'Invalid token. Please check your token and try again.');
      }
    } catch (error) {
      this.showError(errorDiv, `Authentication failed: ${error.message}`);
    }
  }

  async validateToken(token) {
    const response = await this.sendMessage({ action: 'validateToken', token });
    if (response.success) {
      return response.validation;
    }
    throw new Error(response.error);
  }

  async loadRepositories() {
    const repoList = document.getElementById('repo-list');
    repoList.innerHTML = '<div class="loading-repos"><div class="spinner"></div><p>Loading repositories...</p></div>';
    
    try {
      const response = await this.sendMessage({ action: 'getRepositories', token: this.token });
      if (response.success) {
        this.displayRepositories(response.repositories);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      repoList.innerHTML = `<div class="error-state"><p>Failed to load repositories: ${error.message}</p></div>`;
    }
  }

  displayRepositories(repositories) {
    const repoList = document.getElementById('repo-list');
    
    if (repositories.length === 0) {
      repoList.innerHTML = '<div class="empty-state"><p>No repositories found</p></div>';
      return;
    }

    repoList.innerHTML = repositories.map(repo => `
      <div class="repo-item" data-repo='${JSON.stringify(repo)}'>
        <div class="repo-info">
          <div class="repo-header">
            <h3>${repo.name}</h3>
            <span class="repo-visibility">${repo.private ? 'Private' : 'Public'}</span>
          </div>
          ${repo.description ? `<p class="repo-description">${repo.description}</p>` : ''}
          <p class="repo-updated">Updated ${this.formatDate(repo.updated_at)}</p>
        </div>
      </div>
    `).join('');

    // Add click listeners
    document.querySelectorAll('.repo-item').forEach(item => {
      item.addEventListener('click', () => {
        const repo = JSON.parse(item.dataset.repo);
        this.selectRepository(repo);
      });
    });
  }

  filterRepositories(query) {
    const items = document.querySelectorAll('.repo-item');
    items.forEach(item => {
      const repo = JSON.parse(item.dataset.repo);
      const matches = repo.name.toLowerCase().includes(query.toLowerCase()) ||
                     (repo.description && repo.description.toLowerCase().includes(query.toLowerCase()));
      item.style.display = matches ? 'flex' : 'none';
    });
  }

  showCreateRepoForm() {
    document.getElementById('create-repo-form').classList.remove('hidden');
    document.getElementById('repo-name').focus();
  }

  hideCreateRepoForm() {
    document.getElementById('create-repo-form').classList.add('hidden');
    document.getElementById('create-error').classList.add('hidden');
    document.getElementById('repo-name').value = '';
    document.getElementById('repo-description').value = '';
    document.getElementById('repo-private').checked = false;
  }

  async createRepository() {
    const name = document.getElementById('repo-name').value.trim();
    const description = document.getElementById('repo-description').value.trim();
    const isPrivate = document.getElementById('repo-private').checked;
    const errorDiv = document.getElementById('create-error');

    if (!name) {
      this.showError(errorDiv, 'Repository name is required');
      return;
    }

    try {
      const response = await this.sendMessage({
        action: 'createRepository',
        token: this.token,
        name,
        description,
        isPrivate
      });

      if (response.success) {
        this.hideCreateRepoForm();
        await this.loadRepositories();
        this.selectRepository(response.repository);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      this.showError(errorDiv, `Failed to create repository: ${error.message}`);
    }
  }

  selectRepository(repo) {
    this.selectedRepository = repo;
    this.showScreen('upload-screen');
  }

  handleDragOver(e) {
    e.preventDefault();
    document.getElementById('drop-zone').classList.add('drag-over');
  }

  handleDragLeave(e) {
    e.preventDefault();
    document.getElementById('drop-zone').classList.remove('drag-over');
  }

  handleDrop(e) {
    e.preventDefault();
    document.getElementById('drop-zone').classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      this.handleFileSelect(files[0]);
    }
  }

  async handleFileSelect(file) {
    if (!file || !file.name.endsWith('.zip')) {
      this.showError(document.getElementById('upload-error'), 'Please select a ZIP file');
      return;
    }

    try {
      await this.processZipFile(file);
    } catch (error) {
      this.showError(document.getElementById('upload-error'), `Failed to process file: ${error.message}`);
    }
  }

  async processZipFile(file) {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    
    this.uploadedFiles = [];
    const filePromises = [];

    contents.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir) {
        filePromises.push(this.processZipEntry(relativePath, zipEntry));
      }
    });

    await Promise.all(filePromises);
    this.displayFilePreview(file);
  }

  async processZipEntry(path, zipEntry) {
    try {
      const content = await zipEntry.async('string');
      this.uploadedFiles.push({
        path: path,
        content: content,
        isDirectory: false
      });
    } catch (error) {
      // If string conversion fails, try as binary
      const content = await zipEntry.async('uint8array');
      this.uploadedFiles.push({
        path: path,
        content: content,
        isDirectory: false
      });
    }
  }

  displayFilePreview(file) {
    const preview = document.getElementById('file-preview');
    const fileInfo = document.getElementById('file-info');
    const fileList = document.getElementById('file-list');

    fileInfo.innerHTML = `
      <div class="file-details">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 1 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <line x1="10" y1="9" x2="8" y2="9"/>
        </svg>
        <div>
          <h4>${file.name}</h4>
          <p>${this.formatFileSize(file.size)} • ${this.uploadedFiles.length} files</p>
        </div>
      </div>
    `;

    const displayFiles = this.uploadedFiles.slice(0, 10);
    const remainingCount = this.uploadedFiles.length - displayFiles.length;

    fileList.innerHTML = `
      <div class="file-items">
        ${displayFiles.map(file => `
          <div class="file-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 1 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
            </svg>
            <span>${file.path}</span>
          </div>
        `).join('')}
      </div>
      ${remainingCount > 0 ? `<p class="more-files">... and ${remainingCount} more files</p>` : ''}
    `;

    preview.classList.remove('hidden');
  }

  async proceedToCommit() {
    this.showScreen('commit-screen');
    await this.setupCommitScreen();
  }

  async setupCommitScreen() {
    // Display repository info
    const repoInfo = document.getElementById('repo-info');
    repoInfo.innerHTML = `
      <div class="selected-repo">
        <img src="${this.selectedRepository.owner.avatar_url}" alt="${this.selectedRepository.owner.login}" class="repo-avatar">
        <div>
          <h3>${this.selectedRepository.full_name}</h3>
          <p>${this.selectedRepository.description || 'No description'}</p>
        </div>
      </div>
    `;

    // Load branches
    await this.loadBranches();
    
    // Set default commit message
    document.getElementById('commit-message').value = 'Upload project files from Bolt.new';
    this.updateCharCount('Upload project files from Bolt.new');

    // Compare files
    await this.compareFiles();
  }

  async loadBranches() {
    const branchSelect = document.getElementById('branch-select');
    branchSelect.innerHTML = '<option value="">Loading branches...</option>';

    try {
      const response = await this.sendMessage({
        action: 'getBranches',
        token: this.token,
        owner: this.selectedRepository.owner.login,
        repo: this.selectedRepository.name
      });

      if (response.success) {
        branchSelect.innerHTML = response.branches.map(branch => 
          `<option value="${branch}" ${branch === this.selectedRepository.default_branch ? 'selected' : ''}>${branch}</option>`
        ).join('');
      } else {
        branchSelect.innerHTML = `<option value="${this.selectedRepository.default_branch}">${this.selectedRepository.default_branch}</option>`;
      }
    } catch (error) {
      branchSelect.innerHTML = `<option value="${this.selectedRepository.default_branch}">${this.selectedRepository.default_branch}</option>`;
    }
  }

  async compareFiles() {
    const changesContainer = document.getElementById('file-changes-list');
    changesContainer.innerHTML = '<div class="loading-changes"><div class="spinner"></div><p>Analyzing file changes...</p></div>';

    try {
      const branch = document.getElementById('branch-select').value || this.selectedRepository.default_branch;
      
      // Get existing files from repository
      await this.getExistingFiles(branch);
      
      // Define binary image extensions that should be excluded from content comparison
      const BINARY_IMAGE_EXTENSIONS = [
        '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.ico', 
        '.tiff', '.tif', '.avif', '.heic', '.heif'
      ];

      const changes = {
        new: [],
        modified: [],
        unchanged: []
      };

      // Compare uploaded files with existing files
      for (const uploadedFile of this.uploadedFiles) {
        if (uploadedFile.isDirectory) continue;

        // Get file extension
        const fileExtension = this.getFileExtension(uploadedFile.path).toLowerCase();
        
        // Check if this is a binary image file
        if (BINARY_IMAGE_EXTENSIONS.includes(fileExtension)) {
          // For binary images, skip content comparison to avoid false positives
          if (this.existingFiles.has(uploadedFile.path)) {
            // Binary image exists in repo - assume unchanged to avoid encoding issues
            changes.unchanged.push({
              path: uploadedFile.path,
              status: 'unchanged',
              reason: 'Binary image - content comparison skipped'
            });
          } else {
            // New binary image
            changes.new.push({
              path: uploadedFile.path,
              status: 'new'
            });
          }
          continue; // Skip the rest of the loop for binary images
        }

        // For non-binary files (including SVG and text files with base64 images), perform content comparison
        if (this.existingFiles.has(uploadedFile.path)) {
          // File exists, compare content
          try {
            const existingContent = await this.getFileContent(uploadedFile.path);
            const uploadedContent = typeof uploadedFile.content === 'string' 
              ? uploadedFile.content 
              : new TextDecoder().decode(uploadedFile.content);

            if (this.normalizeContent(existingContent) !== this.normalizeContent(uploadedContent)) {
              changes.modified.push({
                path: uploadedFile.path,
                status: 'modified'
              });
            } else {
              changes.unchanged.push({
                path: uploadedFile.path,
                status: 'unchanged'
              });
            }
          } catch (error) {
            console.warn(`Failed to compare ${uploadedFile.path}:`, error);
            changes.modified.push({
              path: uploadedFile.path,
              status: 'modified',
              reason: 'Comparison failed - assuming modified'
            });
          }
        } else {
          // New file
          changes.new.push({
            path: uploadedFile.path,
            status: 'new'
          });
        }
      }

      // Initialize files to push (exclude unchanged files)
      this.filesToPush = this.uploadedFiles.filter(file => {
        const changeItem = [...changes.new, ...changes.modified].find(change => change.path === file.path);
        return changeItem !== undefined;
      });

      this.displayFileChanges(changes);
    } catch (error) {
      changesContainer.innerHTML = `<div class="error-state"><p>Failed to analyze changes: ${error.message}</p></div>`;
    }
  }

  getFileExtension(filePath) {
    const lastDotIndex = filePath.lastIndexOf('.');
    return lastDotIndex !== -1 ? filePath.substring(lastDotIndex) : '';
  }

  async getExistingFiles(branch) {
    try {
      const branchResponse = await this.sendMessage({
        action: 'getBranchDetails',
        token: this.token,
        owner: this.selectedRepository.owner.login,
        repo: this.selectedRepository.name,
        branch: branch
      });

      if (branchResponse.success) {
        const treeResponse = await this.sendMessage({
          action: 'getTree',
          token: this.token,
          owner: this.selectedRepository.owner.login,
          repo: this.selectedRepository.name,
          sha: branchResponse.branchDetails.commit.sha,
          recursive: true
        });

        if (treeResponse.success) {
          this.existingFiles.clear();
          treeResponse.tree.tree.forEach(item => {
            if (item.type === 'blob') {
              this.existingFiles.set(item.path, item.sha);
            }
          });
        }
      }
    } catch (error) {
      console.warn('Failed to get existing files:', error);
      this.existingFiles.clear();
    }
  }

  async getFileContent(filePath) {
    const sha = this.existingFiles.get(filePath);
    if (!sha) return '';

    try {
      const response = await this.sendMessage({
        action: 'getBlobContent',
        token: this.token,
        owner: this.selectedRepository.owner.login,
        repo: this.selectedRepository.name,
        sha: sha
      });

      return response.success ? response.content : '';
    } catch (error) {
      console.warn(`Failed to get content for ${filePath}:`, error);
      return '';
    }
  }

  normalizeContent(content) {
    if (typeof content !== 'string') return '';
    return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  }

  displayFileChanges(changes) {
    const container = document.getElementById('file-changes-list');
    const totalChanges = changes.new.length + changes.modified.length + changes.unchanged.length;

    if (totalChanges === 0) {
      container.innerHTML = '<div class="empty-state"><p>No files to analyze</p></div>';
      return;
    }

    const sections = [
      { title: `New Files (${changes.new.length})`, items: changes.new, color: 'success' },
      { title: `Modified Files (${changes.modified.length})`, items: changes.modified, color: 'warning' },
      { title: `Unchanged Files (${changes.unchanged.length})`, items: changes.unchanged, color: 'secondary' }
    ];

    container.innerHTML = sections.map(section => {
      if (section.items.length === 0) return '';
      
      return `
        <div class="file-category-section expanded">
          <button class="file-category-header" onclick="this.parentElement.classList.toggle('expanded')">
            <span class="category-toggle-icon">▶</span>
            <span class="category-title">${section.title}</span>
          </button>
          <div class="file-category-items">
            ${section.items.map(item => `
              <div class="file-change-item">
                <input type="checkbox" ${section.color !== 'secondary' ? 'checked' : ''} 
                       data-file-path="${item.path}" data-status="${item.status}">
                <span class="file-path">${item.path}</span>
                ${item.reason ? `<small class="change-reason">${item.reason}</small>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    // Add change listeners for checkboxes
    container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', () => this.updateFilesToPush());
    });
  }

  updateFilesToPush() {
    const checkboxes = document.querySelectorAll('#file-changes-list input[type="checkbox"]:checked');
    const selectedPaths = Array.from(checkboxes).map(cb => cb.dataset.filePath);
    
    this.filesToPush = this.uploadedFiles.filter(file => 
      selectedPaths.includes(file.path)
    );
  }

  updateCharCount(message) {
    const charCount = document.querySelector('.char-count');
    const length = message.length;
    charCount.textContent = `${length}/72 characters (recommended)`;
    charCount.classList.toggle('over-limit', length > 72);
  }

  toggleClearWarning(show) {
    const warning = document.getElementById('clear-warning');
    warning.classList.toggle('hidden', !show);
  }

  async pushToRepository() {
    const commitMessage = document.getElementById('commit-message').value.trim();
    const branch = document.getElementById('branch-select').value;
    const clearExisting = document.getElementById('clear-existing').checked;

    if (!commitMessage) {
      this.showError(document.getElementById('commit-error'), 'Commit message is required');
      return;
    }

    if (this.filesToPush.length === 0) {
      this.showError(document.getElementById('commit-error'), 'No files selected for upload');
      return;
    }

    // Show progress
    const progressDiv = document.getElementById('upload-progress');
    const pushBtn = document.getElementById('push-btn');
    
    progressDiv.classList.remove('hidden');
    pushBtn.disabled = true;

    try {
      const filesToDelete = clearExisting ? Array.from(this.existingFiles.keys()) : [];
      
      await this.sendMessage({
        action: 'uploadFiles',
        token: this.token,
        repository: this.selectedRepository,
        files: this.filesToPush,
        commitInfo: {
          message: commitMessage,
          branch: branch,
          clearExisting: clearExisting
        },
        filesToDeletePaths: filesToDelete
      });

      this.showSuccessScreen();
    } catch (error) {
      this.showError(document.getElementById('commit-error'), `Upload failed: ${error.message}`);
      progressDiv.classList.add('hidden');
      pushBtn.disabled = false;
    }
  }

  showSuccessScreen() {
    const successMessage = document.getElementById('success-message');
    successMessage.textContent = `Your project has been successfully uploaded to ${this.selectedRepository.full_name}`;
    this.showScreen('success-screen');
  }

  viewOnGitHub() {
    window.open(this.selectedRepository.html_url, '_blank');
  }

  startOver() {
    this.selectedRepository = null;
    this.uploadedFiles = [];
    this.filesToPush = [];
    this.existingFiles.clear();
    
    // Reset forms
    document.getElementById('file-input').value = '';
    document.getElementById('file-preview').classList.add('hidden');
    document.getElementById('commit-message').value = '';
    document.getElementById('clear-existing').checked = false;
    
    this.showScreen('repo-screen');
  }

  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
  }

  showError(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
    setTimeout(() => {
      element.classList.add('hidden');
    }, 5000);
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return `${Math.ceil(diffDays / 365)} years ago`;
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
  }
}

// Initialize the extension when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new GitHubBridge();
});

// Listen for progress updates
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'uploadProgress') {
    const progressFill = document.getElementById('progress-fill');
    const progressPercent = document.getElementById('progress-percent');
    
    if (progressFill && progressPercent) {
      progressFill.style.width = `${message.progress}%`;
      progressPercent.textContent = `${message.progress}%`;
    }
  }
});