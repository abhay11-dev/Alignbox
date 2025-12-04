// Prefer Vite proxy by default (use relative `/api`). If VITE_API_BASE is set,
// use it as an explicit backend URL. This avoids CORS during development.
const EXPLICIT_API_BASE = import.meta.env.VITE_API_BASE || ''
const API_PREFIX = EXPLICIT_API_BASE ? EXPLICIT_API_BASE.replace(/\/$/,'') + '/api' : '/api'

async function apiFetch(path, options = {}){
  const headers = options.headers || {}
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const resp = await fetch(`${API_PREFIX}${path}`, {
    ...options,
    headers,
    body: options.body instanceof Object && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body
  })

  const contentType = resp.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await resp.json() : await resp.text()
  if (!resp.ok) throw data
  return data
}

export async function login(username, password){
  return apiFetch('/auth/login', { method: 'POST', body: { username, password } })
}

export async function register(payload){
  return apiFetch('/auth/register', { method: 'POST', body: payload })
}

export async function me(token){
  return apiFetch('/auth/me', { method: 'GET', token })
}

export async function getGroups(token){
  return apiFetch('/groups', { method: 'GET', token })
}

export async function createGroup(token, body){
  return apiFetch('/groups', { method: 'POST', token, body })
}

export async function getGroupMessages(token, groupId){
  return apiFetch(`/messages/${groupId}`, { method: 'GET', token })
}

export async function sendMessage(token, groupId, body){
  return apiFetch(`/messages/${groupId}`, { method: 'POST', token, body })
}

export async function uploadFile(token, formData){
  // formData is FormData
  return apiFetch('/upload', { method: 'POST', token, body: formData })
}

export async function getGroupDetails(token, groupId){
  return apiFetch(`/groups/${groupId}`, { method: 'GET', token })
}

export async function searchUsers(token, query){
  if (!query || query.length < 2) return []
  return apiFetch(`/users/search?q=${encodeURIComponent(query)}`, { method: 'GET', token })
}

export async function addGroupMember(token, groupId, userId){
  return apiFetch(`/groups/${groupId}/members`, { method: 'POST', token, body: { userId } })
}

export async function removeGroupMember(token, groupId, userId){
  return apiFetch(`/groups/${groupId}/members/${userId}`, { method: 'DELETE', token })
}

export default { 
  login, register, me, getGroups, createGroup, getGroupMessages, sendMessage, uploadFile,
  getGroupDetails, searchUsers, addGroupMember, removeGroupMember
}
