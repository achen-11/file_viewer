// 子级路由需在通配路由上方声明

// --- 文件夹 ---
k.api.get("subFolders", (folder) => {
  return k.file.subFolders(folder || "")
})

k.api.get("folderFiles", (folder) => {
  return k.file.folderFiles(folder || "")
})

k.api.get("createFolder", (folderName, parentFolder) => {
  return k.file.createFolder(folderName, parentFolder)
})

k.api.get("deleteFolder", (folderName) => {
  return k.file.deleteFolder(folderName)
})

k.api.get("renameFolder", (oldName, newName) => {
  return k.file.renameFolder(oldName, newName)
})

// --- 文件 读 ---
k.api.get("get", (fileName) => {
  return k.file.get(fileName)
})

k.api.get("load", (fileName) => {
  return k.file.load(fileName)
})

k.api.get("read", (fileName) => {
  return k.file.read(fileName)
})

k.api.get("readBinary", (fileName) => {
  return k.file.readBinary(fileName)
})

k.api.get("exists", (fileName) => {
  return k.file.exists(fileName)
})

k.api.get("url", (fileName) => {
  return k.file.url(fileName)
})

k.api.get("getAllFiles", () => {
  return k.file.getAllFiles()
})

// --- 文件 写/删/改 ---
k.api.get("delete", (fileName) => {
  return k.file.delete(fileName)
})

k.api.get("rename", (oldName, newName) => {
  return k.file.rename(oldName, newName)
})

k.api.get("copy", (oldName, newName) => {
  return k.file.copy(oldName, newName)
})

// POST: write, append, writeBinary, createFolder(可选 POST)
k.api.post("write", (body) => {
  const { fileName, content } = typeof body === "string" ? JSON.parse(body) : body
  return k.file.write(fileName, content)
})

k.api.post("append", (body) => {
  const { fileName, content } = typeof body === "string" ? JSON.parse(body) : body
  return k.file.append(fileName, content)
})

k.api.post("writeBinary", (body) => {
  const { fileName, binary } = typeof body === "string" ? JSON.parse(body) : body
  return k.file.writeBinary(fileName, binary)
})

// 断点续传
k.api.get("resumableUploadCreate", (name, size, chunkSize) => {
  return k.file.resumableUpload.create(name, Number(size), Number(chunkSize))
})

k.api.get("resumableUploadGet", () => {
  return k.file.resumableUpload.get()
})

k.api.get("resumableUploadRemove", () => {
  return k.file.resumableUpload.remove()
})
