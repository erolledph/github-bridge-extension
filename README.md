# GitHub Bridge Extension.

A Chrome extension that enables seamless upload of Bolt.new projects directly to GitHub repositories. Bridge the gap between rapid prototyping in Bolt.new and professional version control with GitHub.

## Features

### 🚀 **One-Click Upload**
Upload your entire Bolt.new project to GitHub with just a few clicks. No manual file handling required.

### 🔐 **Secure Authentication**
Authenticate securely using GitHub Personal Access Tokens with proper scope validation and local storage.

### 📁 **Smart File Management**
- Intelligent change detection between local and remote files
- Selective upload of only modified, new, or deleted files
- File categorization and preview before upload
- Support for clearing existing repository contents

### 🌿 **Branch Management**
- Select target branch for uploads
- Automatic branch creation if needed
- Support for all existing repository branches

### 📊 **Repository Operations**
- Browse and search through your GitHub repositories
- Create new repositories directly from the extension
- Real-time repository information and statistics

### 💬 **Commit Control**
- Custom commit messages with character count guidance
- Detailed file change summaries
- Progress tracking for upload operations

## Installation

### From Chrome Web Store
*Coming soon - the extension will be available on the Chrome Web Store*

### Manual Installation (Development)
1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. The GitHub Bridge icon will appear in your Chrome toolbar

## Setup & Usage

### 1. GitHub Token Setup
1. Go to [GitHub Settings > Personal Access Tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give your token a descriptive name (e.g., "GitHub Bridge Extension")
4. Select the following scopes:
   - `repo` - Full repository access
   - `user:email` - Access to user email
5. Click "Generate token" and copy the token immediately
6. **Important**: Save this token securely as GitHub won't show it again

### 2. Extension Authentication
1. Click the GitHub Bridge extension icon in Chrome
2. Enter your GitHub Personal Access Token
3. Click "Authenticate" to validate and store the token

### 3. Upload Process
1. **Export from Bolt.new**: Export your project as a ZIP file from Bolt.new
2. **Select Repository**: Choose an existing repository or create a new one
3. **Upload Files**: Drag and drop or browse for your ZIP file
4. **Review Changes**: Preview file changes and configure commit settings
5. **Push to GitHub**: Complete the upload with a custom commit message

## Technical Details

### Architecture
- **Frontend**: Vanilla JavaScript with modern ES6+ features
- **Backend**: Chrome Extension Service Worker (Manifest V3)
- **Styling**: Custom CSS with design system and CSS variables
- **File Processing**: JSZip library for ZIP file handling
- **API Integration**: GitHub REST API v3

### Key Components

#### GitHubService Class
Handles all GitHub API interactions including:
- Token validation and user authentication
- Repository CRUD operations
- Branch management and Git operations
- File upload and commit creation
- Tree traversal and blob content retrieval

#### UI State Management
- Screen-based navigation system
- Form validation and error handling
- Progress tracking and user feedback
- Responsive design for popup constraints

#### File Processing Pipeline
1. ZIP file validation and extraction
2. File content analysis and encoding
3. Change detection against remote repository
4. Selective upload optimization
5. Git tree and commit creation

### Security Features
- **Content Security Policy**: Strict CSP prevents XSS attacks
- **Token Security**: Secure storage using Chrome's encrypted storage API
- **API Security**: All requests use HTTPS with proper authentication
- **Data Privacy**: No third-party data transmission

## Development

### Prerequisites
- Chrome 88+ (Manifest V3 support)
- GitHub account with repository access
- Basic understanding of Chrome extension development

### Local Development
1. Clone the repository
2. Make your changes to the source files
3. Load the extension in Chrome developer mode
4. Test with a valid GitHub Personal Access Token
5. Verify functionality with test repositories

### File Structure Guidelines
- **popup.html**: Main UI structure and layout
- **popup.js**: Frontend logic, event handling, and UI interactions
- **background.js**: Service worker for GitHub API operations
- **styles/popup.css**: Complete styling system with design tokens
- **manifest.json**: Extension configuration and permissions

### Code Standards
- Use modern JavaScript (ES2020+)
- Follow consistent naming conventions
- Include comprehensive error handling
- Add comments for complex logic
- Maintain separation of concerns

## API Reference

### GitHub API Endpoints
The extension uses the following GitHub REST API endpoints:

- `GET /user` - User information and token validation
- `GET /user/repos` - Repository listing
- `POST /user/repos` - Repository creation
- `GET /repos/{owner}/{repo}/branches` - Branch listing
- `GET /repos/{owner}/{repo}/git/trees/{sha}` - Tree traversal
- `GET /repos/{owner}/{repo}/git/blobs/{sha}` - File content
- `POST /repos/{owner}/{repo}/git/trees` - Tree creation
- `POST /repos/{owner}/{repo}/git/commits` - Commit creation
- `PATCH /repos/{owner}/{repo}/git/refs/heads/{branch}` - Reference updates

### Extension Messaging
Internal message passing between popup and service worker:

```javascript
// Authentication
{ action: 'validateToken', token: string }
{ action: 'storeToken', token: string }
{ action: 'getStoredToken' }

// Repository Operations
{ action: 'getRepositories', token: string }
{ action: 'createRepository', token: string, name: string, description?: string, isPrivate?: boolean }
{ action: 'getBranches', token: string, owner: string, repo: string }

// File Operations
{ action: 'uploadFiles', token: string, repository: object, files: array, commitInfo: object }
{ action: 'getBranchDetails', token: string, owner: string, repo: string, branch: string }
{ action: 'getTree', token: string, owner: string, repo: string, sha: string }
{ action: 'getBlobContent', token: string, owner: string, repo: string, sha: string }
```

## Troubleshooting

### Common Issues

#### Authentication Problems
- **Invalid Token**: Ensure token has correct scopes (`repo`, `user:email`)
- **Expired Token**: Generate a new token if the current one has expired
- **Network Issues**: Check internet connection and GitHub API status

#### Upload Failures
- **Large Files**: GitHub has file size limits (100MB per file, 1GB per repository)
- **Invalid ZIP**: Ensure the ZIP file is valid and exported correctly from Bolt.new
- **Permission Issues**: Verify token has write access to the target repository

#### File Processing Issues
- **Encoding Problems**: The extension handles various text encodings automatically
- **Binary Files**: Binary files are properly encoded for GitHub upload
- **Path Issues**: File paths are normalized for cross-platform compatibility

### Debug Mode
Enable Chrome Developer Tools for the extension popup to access console logs and debug information.

## Contributing

We welcome contributions! Please see [SUMMARY.md](SUMMARY.md) for detailed technical documentation.

### How to Contribute
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the code standards
4. Test thoroughly with various scenarios
5. Submit a pull request with a clear description

### Areas for Contribution
- **Feature Enhancements**: New functionality and improvements
- **Bug Fixes**: Issue resolution and stability improvements
- **Documentation**: Improve documentation and examples
- **Testing**: Add automated tests and improve test coverage
- **Performance**: Optimize file processing and API operations

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

### Getting Help
- **Issues**: Report bugs and request features via GitHub Issues
- **Documentation**: Refer to [SUMMARY.md](SUMMARY.md) for technical details
- **Community**: Join discussions in GitHub Discussions

### Browser Extension
Try the web version at: [github-bridge.netlify.app](https://github-bridge.netlify.app)

---

**Built with ❤️ for the developer community**

*Streamline your workflow from Bolt.new to GitHub with professional-grade tooling and seamless integration.*