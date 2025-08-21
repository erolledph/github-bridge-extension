// GitHub Bridge Extension - Background Service Worker

class GitHubService {
  constructor(token) {
    this.token = token;
    this.baseURL = 'https://api.github.com';
  }

  // Helper function to convert Uint8Array to base64 string
  arrayBufferToBase64(buffer) {
    // Handle both ArrayBuffer and Uint8Array
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    
    // Use a more efficient method for base64 conversion
    const CHUNK_SIZE = 0x8000; // 32KB chunks to avoid call stack limits
    let binary = '';
    
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const chunk = bytes.subarray(i, i + CHUNK_SIZE);
      binary += String.fromCharCode.apply(null, chunk);
    }
    
    return btoa(binary);
  }

  // Helper function to detect if content is binary
  isBinaryContent(content) {
    if (typeof content === 'string') {
      return false;
    }
    
    // Check for binary file extensions
    const binaryExtensions = [
      '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg',
      '.woff', '.woff2', '.ttf', '.eot', '.otf',
      '.pdf', '.zip', '.tar', '.gz', '.rar',
      '.mp3', '.mp4', '.avi', '.mov', '.wav',
      '.exe', '.dll', '.so', '.dylib'
    ];
    
    // If it's a Uint8Array, check for null bytes (common in binary files)
    if (content instanceof Uint8Array) {
      // Check first 1024 bytes for null bytes
      const checkLength = Math.min(1024, content.length);
      for (let i = 0; i < checkLength; i++) {
        if (content[i] === 0) {
          return true;
        }
      }
    }
    
    return false;
  }

  // Helper function to safely convert Uint8Array to string
  uint8ArrayToString(uint8Array) {
    try {
      // Try UTF-8 decoding first
      return new TextDecoder('utf-8', { fatal: true }).decode(uint8Array);
    } catch (error) {
      // If UTF-8 fails, it's likely binary - return null to indicate binary content
      return null;
    }
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-Bridge-Extension',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async validateToken() {
    try {
      const user = await this.makeRequest('/user');
      return {
        valid: true,
        username: user.login,
        scopes: ['repo', 'user:email'] // Assume valid scopes for simplicity
      };
    } catch (error) {
      console.error('Token validation failed:', error);
      return { valid: false };
    }
  }

  async getRepositories() {
    try {
      const repos = await this.makeRequest('/user/repos?sort=updated&per_page=100');
      return repos;
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
      throw new Error('Failed to fetch repositories');
    }
  }

  async getBranches(owner, repo) {
    try {
      const branches = await this.makeRequest(`/repos/${owner}/${repo}/branches?per_page=100`);
      return branches.map(branch => branch.name);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      return [];
    }
  }

  async createRepository(name, description, isPrivate = false) {
    try {
      const repo = await this.makeRequest('/user/repos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          description,
          private: isPrivate,
          auto_init: true
        })
      });
      return repo;
    } catch (error) {
      console.error('Failed to create repository:', error);
      throw new Error(`Failed to create repository: ${error.message}`);
    }
  }

  async getBranchDetails(owner, repo, branch) {
    try {
      const branchData = await this.makeRequest(`/repos/${owner}/${repo}/branches/${branch}`);
      return branchData;
    } catch (error) {
      console.error('Failed to fetch branch details:', error);
      throw new Error(`Failed to fetch branch details: ${error.message}`);
    }
  }

  async getTree(owner, repo, sha, recursive = true) {
    try {
      const tree = await this.makeRequest(`/repos/${owner}/${repo}/git/trees/${sha}${recursive ? '?recursive=1' : ''}`);
      return tree;
    } catch (error) {
      console.error('Failed to fetch tree:', error);
      throw new Error(`Failed to fetch tree: ${error.message}`);
    }
  }

  async getBlobContent(owner, repo, sha) {
    try {
      const blob = await this.makeRequest(`/repos/${owner}/${repo}/git/blobs/${sha}`);
      // Decode base64 content using TextDecoder for proper UTF-8 handling
      if (blob.encoding === 'base64') {
        // Convert base64 to Uint8Array, then decode as UTF-8
        const binaryString = atob(blob.content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(bytes);
      } else {
        return blob.content;
      }
    } catch (error) {
      console.error('Failed to fetch blob content:', error);
      throw new Error(`Failed to fetch blob content: ${error.message}`);
    }
  }

  async getBlobContentRaw(owner, repo, sha) {
    try {
      const blob = await this.makeRequest(`/repos/${owner}/${repo}/git/blobs/${sha}`);
      // Return the raw base64 content without decoding
      if (blob.encoding === 'base64') {
        return blob.content.replace(/\s/g, ''); // Remove any whitespace from base64
      } else {
        // If not base64, properly encode UTF-8 string to base64
        const encoder = new TextEncoder();
        const bytes = encoder.encode(blob.content);
        return this.arrayBufferToBase64(bytes);
      }
    } catch (error) {
      console.error('Failed to fetch raw blob content:', error);
      throw new Error(`Failed to fetch raw blob content: ${error.message}`);
    }
  }

  async uploadFiles(repository, files, commitInfo, filesToDeletePaths = [], onProgress) {
    try {
      const owner = repository.owner.login;
      const repo = repository.name;
      const branch = commitInfo.branch;

      onProgress?.(10);

      // Get current commit SHA
      let currentCommitSha;
      try {
        const branchData = await this.makeRequest(`/repos/${owner}/${repo}/branches/${branch}`);
        currentCommitSha = branchData.commit.sha;
      } catch {
        // Branch doesn't exist, create from default branch
        const defaultBranch = await this.makeRequest(`/repos/${owner}/${repo}/branches/${repository.default_branch}`);
        currentCommitSha = defaultBranch.commit.sha;
      }

      onProgress?.(20);

      // Get current commit
      const currentCommit = await this.makeRequest(`/repos/${owner}/${repo}/git/commits/${currentCommitSha}`);

      onProgress?.(40);

      let treeEntries = [];

      if (commitInfo.clearExisting) {
        // If clearing existing, only include new files
        treeEntries = files
          .filter(file => !file.isDirectory)
          .map(file => ({
            path: file.path,
            mode: '100644',
            type: 'blob',
            ...this.prepareFileContent(file)
          }));
      } else {
        // Get existing tree to preserve files not being deleted
        const existingTree = await this.makeRequest(`/repos/${owner}/${repo}/git/trees/${currentCommit.tree.sha}?recursive=1`);
        
        // Start with existing files, excluding those marked for deletion
        const preservedFiles = existingTree.tree
          .filter(item => item.type === 'blob')
          .filter(item => !filesToDeletePaths.includes(item.path))
          .map(item => ({
            path: item.path,
            mode: item.mode,
            type: item.type,
            sha: item.sha
          }));

        // Add new/modified files
        const newFiles = files
          .filter(file => !file.isDirectory)
          .map(file => ({
            path: file.path,
            mode: '100644',
            type: 'blob',
            ...this.prepareFileContent(file)
          }));

        // Combine preserved and new files, with new files taking precedence
        const fileMap = new Map();
        
        // Add preserved files first
        preservedFiles.forEach(file => {
          fileMap.set(file.path, file);
        });
        
        // Add/overwrite with new files
        newFiles.forEach(file => {
          fileMap.set(file.path, file);
        });
        
        treeEntries = Array.from(fileMap.values());
      }

      // Create new tree
      const newTree = await this.makeRequest(`/repos/${owner}/${repo}/git/trees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tree: treeEntries
        })
      });

      onProgress?.(60);

      // Create new commit
      const newCommit = await this.makeRequest(`/repos/${owner}/${repo}/git/commits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: commitInfo.message,
          tree: newTree.sha,
          parents: [currentCommitSha]
        })
      });

      onProgress?.(80);

      // Update branch reference
      await this.makeRequest(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sha: newCommit.sha
        })
      });

      onProgress?.(100);
    } catch (error) {
      console.error('Failed to upload files:', error);
      throw new Error(`Failed to upload files: ${error.message}`);
    }
  }

  // Helper function to prepare file content for GitHub API
  prepareFileContent(file) {
    // If content is already a string, use it directly
    if (typeof file.content === 'string') {
      return { content: file.content };
    }
    
    // If content is Uint8Array, determine if it's text or binary
    if (file.content instanceof Uint8Array) {
      // Try to detect if it's binary
      if (this.isBinaryContent(file.content)) {
        // Binary file - encode as base64
        return {
          content: this.arrayBufferToBase64(file.content),
          encoding: 'base64'
        };
      } else {
        // Try to convert to string
        const textContent = this.uint8ArrayToString(file.content);
        if (textContent !== null) {
          // Successfully converted to text
          return { content: textContent };
        } else {
          // Conversion failed, treat as binary
          return {
            content: this.arrayBufferToBase64(file.content),
            encoding: 'base64'
          };
        }
      }
    }
    
    // Fallback - treat as binary
    return {
      content: this.arrayBufferToBase64(file.content),
      encoding: 'base64'
    };
  }
}

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);

  switch (request.action) {
    case 'getStoredToken':
      console.log('Processing getStoredToken request');
      chrome.storage.local.get(['github_token'], (result) => {
        console.log('Retrieved stored token:', result.github_token ? 'Token found' : 'No token');
        sendResponse({ success: true, token: result.github_token || null });
      });
      return true;

    case 'storeToken':
      console.log('Processing storeToken request');
      if (!request.token) {
        console.log('No token provided for storage');
        sendResponse({ success: false, error: 'No token provided' });
        return;
      }

      chrome.storage.local.set({ github_token: request.token }, () => {
        console.log('Token stored successfully');
        sendResponse({ success: true });
      });
      return true;

    case 'validateToken':
      console.log('Processing validateToken request');
      if (!request.token) {
        console.log('No token provided for validation');
        sendResponse({ success: false, error: 'No token provided' });
        return;
      }

      const githubService = new GitHubService(request.token);
      githubService.validateToken()
        .then(validation => {
          console.log('Token validation result:', validation);
          sendResponse({ success: true, validation });
        })
        .catch(error => {
          console.error('Token validation error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'getRepositories':
      if (!request.token) {
        sendResponse({ success: false, error: 'No token provided' });
        return;
      }

      const repoService = new GitHubService(request.token);
      repoService.getRepositories()
        .then(repositories => {
          sendResponse({ success: true, repositories });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'getBranches':
      if (!request.token || !request.owner || !request.repo) {
        sendResponse({ success: false, error: 'Missing required parameters' });
        return;
      }

      const branchService = new GitHubService(request.token);
      branchService.getBranches(request.owner, request.repo)
        .then(branches => {
          sendResponse({ success: true, branches });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'createRepository':
      if (!request.token || !request.name) {
        sendResponse({ success: false, error: 'Missing required parameters' });
        return;
      }

      const createService = new GitHubService(request.token);
      createService.createRepository(request.name, request.description, request.isPrivate)
        .then(repository => {
          sendResponse({ success: true, repository });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'getBranchDetails':
      if (!request.token || !request.owner || !request.repo || !request.branch) {
        sendResponse({ success: false, error: 'Missing required parameters' });
        return;
      }

      const branchDetailsService = new GitHubService(request.token);
      branchDetailsService.getBranchDetails(request.owner, request.repo, request.branch)
        .then(branchDetails => {
          sendResponse({ success: true, branchDetails });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'getTree':
      if (!request.token || !request.owner || !request.repo || !request.sha) {
        sendResponse({ success: false, error: 'Missing required parameters' });
        return;
      }

      const treeService = new GitHubService(request.token);
      treeService.getTree(request.owner, request.repo, request.sha, request.recursive)
        .then(tree => {
          sendResponse({ success: true, tree });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'getBlobContent':
      if (!request.token || !request.owner || !request.repo || !request.sha) {
        sendResponse({ success: false, error: 'Missing required parameters' });
        return;
      }

      const blobService = new GitHubService(request.token);
      blobService.getBlobContent(request.owner, request.repo, request.sha)
        .then(content => {
          sendResponse({ success: true, content });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'getBlobContentRaw':
      if (!request.token || !request.owner || !request.repo || !request.sha) {
        sendResponse({ success: false, error: 'Missing required parameters' });
        return;
      }

      const rawBlobService = new GitHubService(request.token);
      rawBlobService.getBlobContentRaw(request.owner, request.repo, request.sha)
        .then(content => {
          sendResponse({ success: true, content });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'uploadFiles':
      if (!request.token || !request.repository || !request.files || !request.commitInfo) {
        sendResponse({ success: false, error: 'Missing required parameters' });
        return;
      }

      const uploadService = new GitHubService(request.token);
      uploadService.uploadFiles(
        request.repository,
        request.files,
        request.commitInfo,
        request.filesToDeletePaths || [],
        (progress) => {
          // Send progress updates
          chrome.runtime.sendMessage({
            action: 'uploadProgress',
            progress
          });
        }
      )
        .then(() => {
          sendResponse({ success: true });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'clearToken':
      chrome.storage.local.remove(['github_token'], () => {
        sendResponse({ success: true });
      });
      return true;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

console.log('GitHub Bridge background script loaded');
