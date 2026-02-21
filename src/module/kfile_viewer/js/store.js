/**
 * 文件管理共享状态与逻辑，由根组件 provide('store', createStore())，子组件 inject('store') 使用。
 */
(function () {
  if (typeof Vue === 'undefined') return;
  var ref = Vue.ref, computed = Vue.computed, watch = Vue.watch;

  function createStore() {
    var currentFolder = ref('');
    var topFolders = ref([]);
    var foldersMap = ref({});
    var files = ref([]);
    var selectedFile = ref(null);
    var previewContent = ref('');
    var previewError = ref('');
    var fileUrl = ref('');
    var editFileName = ref('');
    var editContent = ref('');
    var treeLoading = ref(false);
    var listLoading = ref(false);
    var error = ref('');
    var listError = ref('');
    var modalNewFolder = ref(false);
    var newFolderName = ref('');
    var modalNewFile = ref(false);
    var newFileName = ref('');
    var modalRename = ref({ show: false, oldName: '', newName: '', isFolder: false });
    var modalDelete = ref({ show: false, target: '', isFolder: false });
    var uploading = ref(false);
    var uploadProgress = ref(0);
    var uploadCurrentIndex = ref(0);
    var uploadTotal = ref(0);
    var uploadCurrentName = ref('');
    var listViewMode = ref('grid');
    var sortBy = ref('name');
    var sortOrder = ref('asc');

    var breadcrumbParts = computed(function () {
      var p = currentFolder.value;
      return p ? p.split('/').filter(Boolean) : [];
    });
    var subFoldersInList = computed(function () {
      var list = foldersMap.value[currentFolder.value];
      return list || [];
    });
    var filesInList = computed(function () { return files.value; });
    function sortItems(list, keyOverride) {
      var key = keyOverride != null ? keyOverride : sortBy.value, order = sortOrder.value;
      return list.slice().sort(function (a, b) {
        var va = key === 'name' ? (a.Name || a.FullName || '').toLowerCase() : (key === 'size' ? (a.Size != null ? a.Size : (a.size != null ? a.size : 0)) : (a.LastModified || a.lastModified || ''));
        var vb = key === 'name' ? (b.Name || b.FullName || '').toLowerCase() : (key === 'size' ? (b.Size != null ? b.Size : (b.size != null ? b.size : 0)) : (b.LastModified || b.lastModified || ''));
        if (va < vb) return order === 'asc' ? -1 : 1;
        if (va > vb) return order === 'asc' ? 1 : -1;
        return 0;
      });
    }
    var sortedSubFoldersInList = computed(function () { return sortItems(subFoldersInList.value, 'name'); });
    var sortedFilesInList = computed(function () { return sortItems(filesInList.value); });
    function setSortBy(by) {
      if (sortBy.value === by) sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
      else { sortBy.value = by; sortOrder.value = 'asc'; }
    }
    function getFileIconClass(file) {
      if (!file || !file.Name) return 'text-slate-400';
      var ext = (file.Name || '').split('.').pop().toLowerCase();
      if (['md', 'markdown'].indexOf(ext) !== -1) return 'text-amber-600';
      if (['json', 'js', 'ts', 'html', 'css', 'xml'].indexOf(ext) !== -1) return 'text-indigo-500';
      if (['txt', 'log', 'csv'].indexOf(ext) !== -1) return 'text-slate-500';
      return 'text-slate-400';
    }

    function setError(msg) {
      error.value = msg || '';
      if (msg) setTimeout(function () { error.value = ''; }, 4000);
    }
    function clearError() { error.value = ''; }
    function apiGet(action, params) {
      return http.get(action, { params: params }).catch(function (e) {
        var msg = (e.response && e.response.data && e.response.data.message) || e.message || '请求失败';
        setError(msg);
        throw e;
      });
    }
    function apiPost(action, body) {
      return http.post(action, body).catch(function (e) {
        var msg = (e.response && e.response.data && e.response.data.message) || e.message || '请求失败';
        setError(msg);
        throw e;
      });
    }

    function toArray(val) {
      if (Array.isArray(val)) return val;
      if (val && typeof val === 'object' && Array.isArray(val.data)) return val.data;
      if (val && typeof val === 'object' && Array.isArray(val.list)) return val.list;
      if (val && typeof val === 'object' && Array.isArray(val.items)) return val.items;
      return [];
    }
    function normalizeFolder(f) {
      if (!f || typeof f !== 'object') return f;
      return {
        Name: f.Name != null ? f.Name : f.name,
        FullName: f.FullName != null ? f.FullName : f.fullName
      };
    }
    function normalizeFile(f) {
      if (!f || typeof f !== 'object') return f;
      return {
        Name: f.Name != null ? f.Name : f.name,
        FullName: f.FullName != null ? f.FullName : f.fullName,
        StringSize: f.StringSize != null ? f.StringSize : f.stringSize,
        Size: f.Size != null ? f.Size : f.size,
        LastModified: f.LastModified != null ? f.LastModified : f.lastModified,
        url: f.url,
        RelativeUrl: f.RelativeUrl != null ? f.RelativeUrl : f.relativeUrl,
        AbsoluteUrl: f.AbsoluteUrl != null ? f.AbsoluteUrl : f.absoluteUrl
      };
    }

    function loadTopFolders() {
      treeLoading.value = true;
      listError.value = '';
      apiGet('subFolders', { folder: '' })
        .then(function (data) {
          console.log('data', data);
          var arr = toArray(data).map(normalizeFolder).filter(function (f) { return f && (f.Name != null || f.FullName != null); });
          topFolders.value = arr;
          var nextMap = Object.assign({}, foldersMap.value);
          arr.forEach(function (f) { if (f.FullName) nextMap[f.FullName] = []; });
          foldersMap.value = nextMap;
        })
        .catch(function (e) {
          listError.value = (e.response && e.response.data && e.response.data.message) || e.message || '接口请求失败';
        })
        .finally(function () { treeLoading.value = false; });
    }
    function loadCurrentList() {
      var folder = currentFolder.value;
      listLoading.value = true;
      listError.value = '';
      Promise.all([
        apiGet('subFolders', { folder: folder }),
        apiGet('folderFiles', { folder: folder })
      ]).then(function (res) {
        var subArr = toArray(res[0]).map(normalizeFolder).filter(function (f) { return f && (f.Name != null || f.FullName != null); });
        var fileArr = toArray(res[1]).map(normalizeFile);
        var nextMap = Object.assign({}, foldersMap.value, { [folder]: subArr });
        foldersMap.value = nextMap;
        files.value = fileArr;
      }).catch(function (e) {
        listError.value = (e.response && e.response.data && e.response.data.message) || e.message || '接口请求失败';
      }).finally(function () { listLoading.value = false; });
    }
    function refresh() {
      loadTopFolders();
      loadCurrentList();
      if (selectedFile.value) {
        var name = selectedFile.value.FullName || selectedFile.value.Name;
        selectFile({ FullName: name, Name: name.split('/').pop() });
      }
    }
    function navigateTo(folder) {
      currentFolder.value = folder;
      loadCurrentList();
      selectedFile.value = null;
      previewContent.value = '';
      previewError.value = '';
      fileUrl.value = '';
      editFileName.value = '';
    }

    function selectFile(file) {
      var name = file.FullName || file.Name;
      selectedFile.value = file;
      previewContent.value = '';
      previewError.value = '';
      fileUrl.value = '';
      apiGet('url', { fileName: name }).then(function (url) {
        if (url) fileUrl.value = url.startsWith('http') ? url : (window.location.origin + url);
      });
      var ext = (file.Name || '').split('.').pop().toLowerCase();
      var textExts = ['txt', 'md', 'json', 'html', 'css', 'js', 'ts', 'xml', 'csv', 'log'];
      if (textExts.indexOf(ext) !== -1) {
        apiGet('read', { fileName: name }).then(function (text) {
          previewContent.value = text != null ? String(text) : '';
        }).catch(function () { previewError.value = '无法读取内容'; });
      }
    }
    function isImage(file) {
      if (!file || !file.Name) return false;
      return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'].indexOf((file.Name || '').split('.').pop().toLowerCase()) !== -1;
    }
    function isMarkdown(file) {
      if (!file || !file.Name) return false;
      var ext = (file.Name || '').split('.').pop().toLowerCase();
      return ext === 'md' || ext === 'markdown';
    }
    var previewHtml = computed(function () {
      if (!selectedFile.value || !previewContent.value) return '';
      if (!isMarkdown(selectedFile.value)) return '';
      try {
        return (typeof marked !== 'undefined' && marked.parse) ? marked.parse(previewContent.value) : previewContent.value;
      } catch (e) { return previewContent.value; }
    });
    function copyLink() {
      if (!fileUrl.value) return;
      navigator.clipboard.writeText(fileUrl.value).then(function () { setError('已复制链接'); });
    }
    function startEdit(file) {
      var name = file.FullName || file.Name;
      editFileName.value = name;
      editContent.value = previewContent.value;
      apiGet('read', { fileName: name }).then(function (text) {
        editContent.value = text != null ? String(text) : '';
      }).catch(function () {});
    }
    function cancelEdit() {
      editFileName.value = '';
      editContent.value = '';
    }
    function saveEdit() {
      var name = editFileName.value;
      if (!name) return;
      apiPost('write', { fileName: name, content: editContent.value })
        .then(function () { cancelEdit(); refresh(); setError('已保存'); });
    }
    function confirmDelete(target, isFolder) {
      modalDelete.value = { show: true, target: target, isFolder: isFolder };
    }
    function submitDelete() {
      var target = modalDelete.value.target, isFolder = modalDelete.value.isFolder;
      modalDelete.value.show = false;
      apiGet(isFolder ? 'deleteFolder' : 'delete', isFolder ? { folderName: target } : { fileName: target }).then(function () {
        if (selectedFile.value && (selectedFile.value.FullName || selectedFile.value.Name) === target) {
          selectedFile.value = null;
          previewContent.value = '';
          editFileName.value = '';
        }
        refresh();
        setError('已删除');
      });
    }
    function openNewFolderModal() {
      newFolderName.value = '';
      modalNewFolder.value = true;
    }
    function openNewFileModal() {
      newFileName.value = '';
      modalNewFile.value = true;
    }
    function submitNewFile() {
      var name = newFileName.value.trim();
      if (!validateName(name)) { setError('文件名为空或不能包含 /'); return; }
      var fullName = currentFolder.value ? currentFolder.value + '/' + name : name;
      apiPost('write', { fileName: fullName, content: '' })
        .then(function () { modalNewFile.value = false; newFileName.value = ''; loadCurrentList(); setError('已创建'); });
    }
    function submitNewFolder() {
      var name = newFolderName.value.trim();
      if (!validateName(name)) { setError('文件夹名为空或不能包含 /'); return; }
      var parent = currentFolder.value;
      apiGet('createFolder', parent ? { folderName: name, parentFolder: parent } : { folderName: name })
        .then(function () { modalNewFolder.value = false; newFolderName.value = ''; loadTopFolders(); loadCurrentList(); setError('已创建'); });
    }
    function openRenameModal(fullName, isFolder) {
      modalRename.value = { show: true, oldName: fullName, newName: fullName.split('/').pop(), isFolder: isFolder };
    }
    function submitRename() {
      var o = modalRename.value;
      if (!validateName(o.newName.trim())) { setError('名称为空或不能包含 /'); return; }
      apiGet(o.isFolder ? 'renameFolder' : 'rename', { oldName: o.oldName, newName: o.newName.trim() }).then(function () {
        modalRename.value.show = false;
        if (selectedFile.value && (selectedFile.value.FullName || selectedFile.value.Name) === o.oldName) {
          selectedFile.value = null;
          previewContent.value = '';
          editFileName.value = '';
        }
        refresh();
        setError('已重命名');
      });
    }
    function onFileSelect(ev) {
      var input = ev.target, list = input.files;
      if (!list || list.length === 0) return;
      var prefix = currentFolder.value ? currentFolder.value + '/' : '';
      uploading.value = true;
      uploadProgress.value = 0;
      uploadTotal.value = list.length;
      uploadCurrentIndex.value = 0;
      uploadCurrentName.value = '';
      var done = 0, total = list.length;
      function next(i) {
        if (i >= total) {
          uploading.value = false;
          uploadCurrentName.value = '';
          input.value = '';
          refresh();
          setError('上传完成');
          return;
        }
        var file = list[i], fileName = prefix + file.name;
        uploadCurrentIndex.value = i + 1;
        uploadCurrentName.value = file.name;
        var reader = new FileReader();
        reader.onload = function () {
          apiPost('writeBinary', { fileName: fileName, binary: Array.from(new Uint8Array(reader.result)) })
            .then(function () { done++; uploadProgress.value = Math.round((done / total) * 100); next(i + 1); })
            .catch(function () { next(i + 1); });
        };
        reader.readAsArrayBuffer(file);
      }
      next(0);
    }
    function closeNewFolderModal() { modalNewFolder.value = false; newFolderName.value = ''; }
    function closeNewFileModal() { modalNewFile.value = false; newFileName.value = ''; }
    function closeRenameModal() { modalRename.value.show = false; }
    function closeDeleteModal() { modalDelete.value.show = false; }
    function validateName(name) { return name && name.indexOf('/') === -1 && !/^\s*$/.test(name); }

    watch(currentFolder, function () { loadCurrentList(); }, { immediate: false });
    loadTopFolders();
    loadCurrentList();

    return {
      currentFolder, topFolders, foldersMap, files, selectedFile, previewContent, previewError, fileUrl,
      editFileName, editContent, treeLoading, listLoading, error, listError, modalNewFolder, newFolderName,
      modalNewFile, newFileName, modalRename, modalDelete, uploading, uploadProgress, uploadCurrentIndex, uploadTotal, uploadCurrentName,
      breadcrumbParts, subFoldersInList, filesInList, sortedSubFoldersInList, sortedFilesInList,
      listViewMode, sortBy, sortOrder, setSortBy, getFileIconClass,
      refresh, navigateTo, selectFile, isImage, isMarkdown, previewHtml, copyLink, startEdit, cancelEdit, saveEdit,
      confirmDelete, submitDelete, openNewFolderModal, submitNewFolder, openNewFileModal, submitNewFile,
      openRenameModal, submitRename, onFileSelect, clearError,
      closeNewFolderModal, closeNewFileModal, closeRenameModal, closeDeleteModal
    };
  }

  window.KFileViewerCreateStore = createStore;
})();
