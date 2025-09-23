class JSONAdminPanel {
    constructor() {
        this.data = { version: "", content: [] };
        this.currentView = 'raw'; // 'raw' or 'tree'
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadFromStorage();
        this.render();
    }

    bindEvents() {
        // Import/Export events
        document.getElementById('importBtn').addEventListener('click', () => this.showImport());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadJSON());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearAll());
        
        document.getElementById('selectFileBtn').addEventListener('click', () => document.getElementById('fileInput').click());
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFile(e));
        document.getElementById('loadJsonBtn').addEventListener('click', () => this.loadJSON());
        document.getElementById('cancelImportBtn').addEventListener('click', () => this.hideImport());

        // Section events
        document.getElementById('addSectionBtn').addEventListener('click', () => this.addSection());
        document.getElementById('version').addEventListener('input', (e) => this.updateVersion(e.target.value));

        // Visualizer events
        document.getElementById('formatJsonBtn').addEventListener('click', () => this.updateVisualizer());
        document.getElementById('copyJsonBtn').addEventListener('click', () => this.copyVisualizerJSON());
        document.getElementById('rawViewBtn').addEventListener('click', () => this.switchView('raw'));
        document.getElementById('treeViewBtn').addEventListener('click', () => this.switchView('tree'));

        // Auto-save and update visualizer on changes
        document.addEventListener('input', () => {
            this.saveToStorage();
            this.updateVisualizer();
        });
        document.addEventListener('change', () => {
            this.saveToStorage();
            this.updateVisualizer();
        });
    }

    // Storage methods
    saveToStorage() {
        try {
            localStorage.setItem('jsonAdminData', JSON.stringify(this.data));
        } catch (e) {
            console.warn('Failed to save to localStorage:', e);
        }
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('jsonAdminData');
            if (saved) {
                this.data = JSON.parse(saved);
                return true;
            }
        } catch (e) {
            console.warn('Failed to load from localStorage:', e);
        }
        return false;
    }

    clearStorage() {
        localStorage.removeItem('jsonAdminData');
    }

    // Import/Export methods
    showImport() {
        document.getElementById('importSection').style.display = 'block';
    }

    hideImport() {
        document.getElementById('importSection').style.display = 'none';
        document.getElementById('jsonTextArea').value = '';
        document.getElementById('fileInput').value = '';
    }

    handleFile(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('jsonTextArea').value = e.target.result;
            };
            reader.readAsText(file);
        }
    }

    loadJSON() {
        try {
            const jsonText = document.getElementById('jsonTextArea').value.trim();
            if (!jsonText) {
                this.showMessage('Please provide JSON content', 'error');
                return;
            }

            const parsed = JSON.parse(jsonText);
            if (!parsed.hasOwnProperty('version') || !parsed.hasOwnProperty('content')) {
                this.showMessage('Invalid JSON structure - missing version or content', 'error');
                return;
            }

            this.data = parsed;
            this.render();
            this.saveToStorage();
            this.hideImport();
            this.showMessage('JSON loaded successfully!', 'success');
        } catch (error) {
            this.showMessage('Invalid JSON: ' + error.message, 'error');
        }
    }

    downloadJSON() {
        try {
            const jsonString = JSON.stringify(this.data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `data_v${this.data.version || 'export'}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.showMessage('JSON downloaded successfully!', 'success');
        } catch (error) {
            this.showMessage('Download failed: ' + error.message, 'error');
        }
    }

    clearAll() {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            this.data = { version: "", content: [] };
            this.clearStorage();
            this.render();
            this.showMessage('All data cleared', 'warning');
        }
    }

    // Render methods
    render() {
        this.renderVersion();
        this.renderSections();
        this.updateVisualizer();
    }

    renderVersion() {
        document.getElementById('version').value = this.data.version || '';
    }

    renderSections() {
        const container = document.getElementById('sectionsContainer');
        
        if (!this.data.content || this.data.content.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <h3>No content sections</h3>
                    <p>Import a JSON file or add a new section to get started</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        this.data.content.forEach((section, index) => {
            container.appendChild(this.createSectionElement(section, index));
        });
    }

    createSectionElement(section, index) {
        const div = document.createElement('div');
        div.className = 'section-item';
        div.innerHTML = `
            <div class="section-item-header" onclick="window.adminPanel.toggleSection(${index})">
                <h3>
                    <i class="fas fa-folder"></i>
                    <span>Section ${index + 1}: ${section.name || 'Untitled'}</span>
                </h3>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="section-actions" onclick="event.stopPropagation()">
                        <button class="btn btn-success btn-small" onclick="window.adminPanel.addList(${index})">
                            <i class="fas fa-plus"></i> Add List
                        </button>
                        <button class="btn btn-danger btn-small" onclick="window.adminPanel.removeSection(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <button class="collapse-btn collapsed">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
            <div class="section-content collapsed" id="section-content-${index}">
                <div class="form-row">
                    <div class="form-group">
                        <label>Name (English)</label>
                        <input type="text" class="form-control" value="${section.name || ''}" 
                               onchange="window.adminPanel.updateSection(${index}, 'name', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Name (Hindi)</label>
                        <input type="text" class="form-control" value="${section.nameHi || ''}" 
                               onchange="window.adminPanel.updateSection(${index}, 'nameHi', this.value)">
                    </div>
                </div>
                <div class="form-group">
                    <label>Icon</label>
                    <input type="text" class="form-control" value="${section.icon || ''}" 
                           onchange="window.adminPanel.updateSection(${index}, 'icon', this.value)">
                </div>
                <div class="list-container">
                    <div class="list-header">
                        <h4>Lists (${section.lists ? section.lists.length : 0})</h4>
                    </div>
                    <div id="lists-${index}"></div>
                </div>
            </div>
        `;

        // Render lists
        setTimeout(() => this.renderLists(index), 0);
        return div;
    }

    renderLists(sectionIndex) {
        const container = document.getElementById(`lists-${sectionIndex}`);
        if (!container) return;

        const section = this.data.content[sectionIndex];
        if (!section.lists || section.lists.length === 0) {
            container.innerHTML = '<p style="color: #a0aec0; text-align: center; padding: 20px;">No lists added yet</p>';
            return;
        }

        container.innerHTML = '';
        section.lists.forEach((list, listIndex) => {
            container.appendChild(this.createListElement(list, sectionIndex, listIndex));
        });
    }

    createListElement(list, sectionIndex, listIndex) {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-item-header">
                <h5><i class="fas fa-list"></i> ${list.name || 'Untitled List'}</h5>
                <div class="section-actions">
                    ${list.type === 'list' ? `
                        <button class="btn btn-success btn-small" onclick="window.adminPanel.addListItem(${sectionIndex}, ${listIndex})">
                            <i class="fas fa-plus"></i> Add Item
                        </button>
                    ` : ''}
                    <button class="btn btn-danger btn-small" onclick="window.adminPanel.removeList(${sectionIndex}, ${listIndex})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Name (English)</label>
                    <input type="text" class="form-control" value="${list.name || ''}" 
                           onchange="window.adminPanel.updateList(${sectionIndex}, ${listIndex}, 'name', this.value)">
                </div>
                <div class="form-group">
                    <label>Name (Hindi)</label>
                    <input type="text" class="form-control" value="${list.nameHi || ''}" 
                           onchange="window.adminPanel.updateList(${sectionIndex}, ${listIndex}, 'nameHi', this.value)">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Icon</label>
                    <input type="text" class="form-control" value="${list.icon || ''}" 
                           onchange="window.adminPanel.updateList(${sectionIndex}, ${listIndex}, 'icon', this.value)">
                </div>
                <div class="form-group">
                    <label>Type</label>
                    <div class="type-buttons">
                        <button class="type-btn ${list.type === 'text' ? 'active' : ''}" 
                                onclick="window.adminPanel.changeListType(${sectionIndex}, ${listIndex}, 'text')">Text</button>
                        <button class="type-btn ${list.type === 'list' ? 'active' : ''}" 
                                onclick="window.adminPanel.changeListType(${sectionIndex}, ${listIndex}, 'list')">List</button>
                    </div>
                </div>
            </div>
            <div class="content-section" id="list-content-${sectionIndex}-${listIndex}"></div>
        `;

        // Render content
        setTimeout(() => this.renderListContent(sectionIndex, listIndex), 0);
        return div;
    }

    renderListContent(sectionIndex, listIndex) {
        const container = document.getElementById(`list-content-${sectionIndex}-${listIndex}`);
        if (!container) return;

        const list = this.data.content[sectionIndex].lists[listIndex];
        
        if (list.type === 'text') {
            container.innerHTML = `
                <div class="form-group">
                    <label>Content (English) - HTML Supported</label>
                    <textarea class="form-control html-content" rows="4" placeholder="You can use HTML tags like &lt;b&gt;, &lt;br&gt;, &lt;i&gt;, &lt;u&gt;, etc."
                              onchange="window.adminPanel.updateList(${sectionIndex}, ${listIndex}, 'content', this.value)">${list.content || ''}</textarea>
                    <div class="html-preview" id="preview-en-${sectionIndex}-${listIndex}">
                        <small class="preview-label">Preview:</small>
                        <div class="preview-content">${list.content || 'No content'}</div>
                    </div>
                </div>
                <div class="form-group">
                    <label>Content (Hindi) - HTML Supported</label>
                    <textarea class="form-control html-content" rows="4" placeholder="आप HTML टैग्स का उपयोग कर सकते हैं जैसे &lt;b&gt;, &lt;br&gt;, &lt;i&gt;, &lt;u&gt;, आदि।"
                              onchange="window.adminPanel.updateList(${sectionIndex}, ${listIndex}, 'contentHi', this.value)">${list.contentHi || ''}</textarea>
                    <div class="html-preview" id="preview-hi-${sectionIndex}-${listIndex}">
                        <small class="preview-label">Preview:</small>
                        <div class="preview-content">${list.contentHi || 'No content'}</div>
                    </div>
                </div>
            `;
        } else if (list.type === 'list') {
            container.innerHTML = `<div id="list-items-${sectionIndex}-${listIndex}"></div>`;
            this.renderListItems(sectionIndex, listIndex);
        }
    }

    renderListItems(sectionIndex, listIndex) {
        const container = document.getElementById(`list-items-${sectionIndex}-${listIndex}`);
        if (!container) return;

        const list = this.data.content[sectionIndex].lists[listIndex];
        if (!list.content || !Array.isArray(list.content) || list.content.length === 0) {
            container.innerHTML = '<p style="color: #a0aec0; text-align: center; padding: 15px;">No items added yet</p>';
            return;
        }

        container.innerHTML = '';
        list.content.forEach((item, itemIndex) => {
            container.appendChild(this.createListItemElement(item, sectionIndex, listIndex, itemIndex));
        });
    }

    createListItemElement(item, sectionIndex, listIndex, itemIndex) {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.style.marginLeft = '20px';
        div.innerHTML = `
            <div class="list-item-header" onclick="window.adminPanel.toggleListItem(${sectionIndex}, ${listIndex}, ${itemIndex})">
                <h5>
                    <i class="fas fa-question-circle"></i> Item ${itemIndex + 1}
                    ${item.question ? ': ' + (item.question.length > 50 ? item.question.substring(0, 50) + '...' : item.question) : ''}
                </h5>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <button class="btn btn-danger btn-small" onclick="event.stopPropagation(); window.adminPanel.removeListItem(${sectionIndex}, ${listIndex}, ${itemIndex})">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="collapse-btn collapsed">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
            <div class="list-item-content collapsed" id="list-item-content-${sectionIndex}-${listIndex}-${itemIndex}">
                <div class="form-group">
                    <label>Question (English)</label>
                    <textarea class="form-control" rows="2" 
                              onchange="window.adminPanel.updateListItem(${sectionIndex}, ${listIndex}, ${itemIndex}, 'question', this.value)">${item.question || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Question (Hindi)</label>
                    <textarea class="form-control" rows="2" 
                              onchange="window.adminPanel.updateListItem(${sectionIndex}, ${listIndex}, ${itemIndex}, 'questionHi', this.value)">${item.questionHi || ''}</textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Answer (English)</label>
                        <textarea class="form-control" rows="2" 
                                  onchange="window.adminPanel.updateListItem(${sectionIndex}, ${listIndex}, ${itemIndex}, 'answer', this.value)">${item.answer || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Answer (Hindi)</label>
                        <textarea class="form-control" rows="2" 
                                  onchange="window.adminPanel.updateListItem(${sectionIndex}, ${listIndex}, ${itemIndex}, 'answerHi', this.value)">${item.answerHi || ''}</textarea>
                    </div>
                </div>
                <div class="form-group">
                    <label>Explanation (English)</label>
                    <textarea class="form-control" rows="2" 
                              onchange="window.adminPanel.updateListItem(${sectionIndex}, ${listIndex}, ${itemIndex}, 'explanation', this.value)">${item.explanation || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Explanation (Hindi)</label>
                    <textarea class="form-control" rows="2" 
                              onchange="window.adminPanel.updateListItem(${sectionIndex}, ${listIndex}, ${itemIndex}, 'explanationHi', this.value)">${item.explanationHi || ''}</textarea>
                </div>
            </div>
        `;
        return div;
    }

    // Update methods
    updateVersion(value) {
        this.data.version = value;
        this.saveToStorage();
    }

    updateSection(index, field, value) {
        this.data.content[index][field] = value;
        this.saveToStorage();
        // Update the header display
        const header = document.querySelector(`#section-content-${index}`).previousElementSibling;
        const nameSpan = header.querySelector('span');
        if (field === 'name') {
            nameSpan.textContent = `Section ${index + 1}: ${value || 'Untitled'}`;
        }
    }

    updateList(sectionIndex, listIndex, field, value) {
        this.data.content[sectionIndex].lists[listIndex][field] = value;
        this.saveToStorage();
        
        // Update HTML preview if it's a content field
        if ((field === 'content' || field === 'contentHi') && this.data.content[sectionIndex].lists[listIndex].type === 'text') {
            const previewId = field === 'content' ? 
                `preview-en-${sectionIndex}-${listIndex}` : 
                `preview-hi-${sectionIndex}-${listIndex}`;
            const previewElement = document.getElementById(previewId);
            if (previewElement) {
                const previewContent = previewElement.querySelector('.preview-content');
                if (previewContent) {
                    previewContent.innerHTML = value || 'No content';
                }
            }
        }
        
        // Update the header display
        if (field === 'name') {
            const listElement = document.querySelector(`#lists-${sectionIndex}`).children[listIndex];
            const nameElement = listElement.querySelector('h5');
            if (nameElement) {
                nameElement.innerHTML = `<i class="fas fa-list"></i> ${value || 'Untitled List'}`;
            }
        }
    }

    updateListItem(sectionIndex, listIndex, itemIndex, field, value) {
        this.data.content[sectionIndex].lists[listIndex].content[itemIndex][field] = value;
        this.saveToStorage();
    }

    // Add/Remove methods
    addSection() {
        const newSection = {
            name: "",
            nameHi: "",
            icon: "",
            lists: []
        };
        this.data.content.push(newSection);
        this.saveToStorage();
        this.renderSections();
    }

    removeSection(index) {
        if (confirm('Are you sure you want to remove this section and all its content?')) {
            this.data.content.splice(index, 1);
            this.saveToStorage();
            this.renderSections();
        }
    }

    addList(sectionIndex) {
        const newList = {
            name: "",
            nameHi: "",
            icon: "",
            type: "text",
            content: "",
            contentHi: ""
        };
        
        if (!this.data.content[sectionIndex].lists) {
            this.data.content[sectionIndex].lists = [];
        }
        
        this.data.content[sectionIndex].lists.push(newList);
        this.saveToStorage();
        this.renderLists(sectionIndex);
    }

    removeList(sectionIndex, listIndex) {
        if (confirm('Are you sure you want to remove this list?')) {
            this.data.content[sectionIndex].lists.splice(listIndex, 1);
            this.saveToStorage();
            this.renderLists(sectionIndex);
        }
    }

    addListItem(sectionIndex, listIndex) {
        const newItem = {
            question: "",
            questionHi: "",
            answer: "",
            answerHi: "",
            explanation: "",
            explanationHi: ""
        };

        const list = this.data.content[sectionIndex].lists[listIndex];
        if (!Array.isArray(list.content)) {
            list.content = [];
        }
        
        list.content.push(newItem);
        this.saveToStorage();
        this.renderListItems(sectionIndex, listIndex);
    }

    removeListItem(sectionIndex, listIndex, itemIndex) {
        if (confirm('Are you sure you want to remove this item?')) {
            this.data.content[sectionIndex].lists[listIndex].content.splice(itemIndex, 1);
            this.saveToStorage();
            this.renderListItems(sectionIndex, listIndex);
        }
    }

    changeListType(sectionIndex, listIndex, newType) {
        const list = this.data.content[sectionIndex].lists[listIndex];
        list.type = newType;
        
        if (newType === 'text') {
            list.content = "";
            list.contentHi = "";
        } else if (newType === 'list') {
            list.content = [];
            delete list.contentHi;
        }
        
        this.saveToStorage();
        this.renderListContent(sectionIndex, listIndex);
        
        // Update the buttons and add item button
        this.renderLists(sectionIndex);
        
        // Update visualizer to reflect the change
        this.updateVisualizer();
    }

    // UI methods
    toggleSection(index) {
        const content = document.getElementById(`section-content-${index}`);
        const btn = content.previousElementSibling.querySelector('.collapse-btn i');
        
        if (content.classList.contains('collapsed')) {
            content.classList.remove('collapsed');
            btn.classList.remove('fa-chevron-right');
            btn.classList.add('fa-chevron-down');
        } else {
            content.classList.add('collapsed');
            btn.classList.remove('fa-chevron-down');
            btn.classList.add('fa-chevron-right');
        }
    }

    toggleListItem(sectionIndex, listIndex, itemIndex) {
        const content = document.getElementById(`list-item-content-${sectionIndex}-${listIndex}-${itemIndex}`);
        const btn = content.previousElementSibling.querySelector('.collapse-btn i');
        
        if (content.classList.contains('collapsed')) {
            content.classList.remove('collapsed');
            btn.classList.remove('fa-chevron-right');
            btn.classList.add('fa-chevron-down');
        } else {
            content.classList.add('collapsed');
            btn.classList.remove('fa-chevron-down');
            btn.classList.add('fa-chevron-right');
        }
    }

    showMessage(message, type = 'success') {
        const container = document.getElementById('messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const iconClass = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle'
        }[type] || 'fa-info-circle';
        
        messageDiv.innerHTML = `
            <i class="fas ${iconClass}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(messageDiv);
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 4000);
    }

    // JSON Visualizer methods
    updateVisualizer() {
        try {
            if (this.currentView === 'raw') {
                const jsonString = JSON.stringify(this.data, null, 2);
                const highlighted = this.highlightJSON(jsonString);
                document.getElementById('jsonVisualizer').innerHTML = highlighted;
            } else {
                this.renderTreeView();
            }
        } catch (error) {
            document.getElementById('jsonVisualizer').textContent = 'Error: Invalid JSON structure';
            document.getElementById('treeView').innerHTML = '<div style="padding: 20px; color: #e53e3e;">Error: Invalid JSON structure</div>';
        }
    }

    switchView(view) {
        this.currentView = view;
        
        // Update button states
        document.getElementById('rawViewBtn').classList.toggle('active', view === 'raw');
        document.getElementById('treeViewBtn').classList.toggle('active', view === 'tree');
        
        // Toggle visibility
        document.getElementById('jsonVisualizerPre').classList.toggle('hidden', view === 'tree');
        document.getElementById('treeView').classList.toggle('hidden', view === 'raw');
        
        this.updateVisualizer();
    }

    renderTreeView() {
        const container = document.getElementById('treeView');
        container.innerHTML = '';
        
        if (!this.data || Object.keys(this.data).length === 0) {
            container.innerHTML = '<div style="padding: 20px; color: #a0aec0; text-align: center;">No data to display</div>';
            return;
        }
        
        const tree = this.createTreeNode('root', this.data, 0);
        container.appendChild(tree);
    }

    createTreeNode(key, value, depth) {
        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'tree-node';
        
        if (value === null) {
            nodeDiv.innerHTML = `<span class="tree-key">${key}:</span> <span class="tree-value null">null</span>`;
        } else if (typeof value === 'object' && !Array.isArray(value)) {
            const keys = Object.keys(value);
            const hasChildren = keys.length > 0;
            
            nodeDiv.innerHTML = `
                <span class="tree-key" onclick="window.adminPanel.toggleTreeNode(this)" data-key="${key}">
                    ${hasChildren ? '<i class="fas fa-chevron-down toggle-icon"></i>' : ''}
                    ${key === 'root' ? 'JSON Object' : key}:
                    <span class="tree-type">{${keys.length} ${keys.length === 1 ? 'property' : 'properties'}}</span>
                </span>
            `;
            
            if (hasChildren) {
                const childrenDiv = document.createElement('div');
                childrenDiv.className = 'tree-children';
                
                keys.forEach(childKey => {
                    childrenDiv.appendChild(this.createTreeNode(childKey, value[childKey], depth + 1));
                });
                
                nodeDiv.appendChild(childrenDiv);
            }
        } else if (Array.isArray(value)) {
            const hasChildren = value.length > 0;
            
            nodeDiv.innerHTML = `
                <span class="tree-key" onclick="window.adminPanel.toggleTreeNode(this)" data-key="${key}">
                    ${hasChildren ? '<i class="fas fa-chevron-down toggle-icon"></i>' : ''}
                    ${key}:
                    <span class="tree-type">[${value.length} ${value.length === 1 ? 'item' : 'items'}]</span>
                </span>
            `;
            
            if (hasChildren) {
                const childrenDiv = document.createElement('div');
                childrenDiv.className = 'tree-children';
                
                value.forEach((item, index) => {
                    childrenDiv.appendChild(this.createTreeNode(`[${index}]`, item, depth + 1));
                });
                
                nodeDiv.appendChild(childrenDiv);
            }
        } else {
            const valueType = typeof value;
            const displayValue = valueType === 'string' ? `"${value}"` : String(value);
            nodeDiv.innerHTML = `<span class="tree-key">${key}:</span> <span class="tree-value ${valueType}">${displayValue}</span>`;
        }
        
        return nodeDiv;
    }

    toggleTreeNode(element) {
        const node = element.closest('.tree-node');
        const children = node.querySelector('.tree-children');
        const icon = element.querySelector('.toggle-icon');
        
        if (children && icon) {
            node.classList.toggle('collapsed');
            
            if (node.classList.contains('collapsed')) {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-right');
            } else {
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-down');
            }
        }
    }

    highlightJSON(json) {
        // Simple JSON syntax highlighting
        return json
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
                let cls = 'number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'key';
                    } else {
                        cls = 'string';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'boolean';
                } else if (/null/.test(match)) {
                    cls = 'null';
                }
                return '<span class="' + cls + '">' + match + '</span>';
            })
            .replace(/([{}[\],])/g, '<span class="punctuation">$1</span>');
    }

    copyVisualizerJSON() {
        try {
            const jsonString = JSON.stringify(this.data, null, 2);
            navigator.clipboard.writeText(jsonString).then(() => {
                this.showMessage('JSON copied to clipboard!', 'success');
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = jsonString;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showMessage('JSON copied to clipboard!', 'success');
            });
        } catch (error) {
            this.showMessage('Failed to copy JSON', 'error');
        }
    }
}

// Initialize admin panel
let adminPanel;

document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new JSONAdminPanel();
});

// Global functions for inline event handlers
window.adminPanel = {
    toggleSection: (index) => adminPanel.toggleSection(index),
    toggleListItem: (sectionIndex, listIndex, itemIndex) => adminPanel.toggleListItem(sectionIndex, listIndex, itemIndex),
    toggleTreeNode: (element) => adminPanel.toggleTreeNode(element),
    addList: (sectionIndex) => adminPanel.addList(sectionIndex),
    removeSection: (index) => adminPanel.removeSection(index),
    removeList: (sectionIndex, listIndex) => adminPanel.removeList(sectionIndex, listIndex),
    addListItem: (sectionIndex, listIndex) => adminPanel.addListItem(sectionIndex, listIndex),
    removeListItem: (sectionIndex, listIndex, itemIndex) => adminPanel.removeListItem(sectionIndex, listIndex, itemIndex),
    changeListType: (sectionIndex, listIndex, newType) => adminPanel.changeListType(sectionIndex, listIndex, newType),
    updateSection: (index, field, value) => adminPanel.updateSection(index, field, value),
    updateList: (sectionIndex, listIndex, field, value) => adminPanel.updateList(sectionIndex, listIndex, field, value),
    updateListItem: (sectionIndex, listIndex, itemIndex, field, value) => adminPanel.updateListItem(sectionIndex, listIndex, itemIndex, field, value)
};