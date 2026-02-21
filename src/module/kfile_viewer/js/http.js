// API 根路径：同源留空；或设 window.__KFILE_API_BASE__ 再加载此脚本
var baseUrl = typeof baseUrl !== 'undefined' ? baseUrl : { value: (typeof window !== 'undefined' && window.__KFILE_API_BASE__ !== undefined) ? window.__KFILE_API_BASE__ : '' };
var http = axios.create({
    timeout: 300000,
    baseURL: baseUrl.value,
})

// 添加请求拦截器
http.interceptors.request.use(config => {
    return config
})

// 添加响应拦截器
http.interceptors.response.use(response => {
    if (response.headers['content-type'] === 'application/pdf') {
        return response.data?.data != null ? response.data.data : response.data
    }
    // 兼容直接返回 body 或 { data } 包装
    return response.data?.data !== undefined ? response.data.data : response.data
}, error => {
    const rspData = error.response?.data
    const msg = typeof rspData === 'string' ? rspData : rspData?.msg
    console.error('response, ', error);
    console.error('请求错误\n' + msg)
    // msg && notification.error({ message: t('请求异常'), description: msg })
    return Promise.reject(error)
})