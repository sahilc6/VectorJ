const API = '/api'

export async function fetchItems() {
  const res = await fetch(`${API}/items`)
  return res.json()
}

export async function searchVectors(v, k, metric, algo) {
  const url = `${API}/search?v=${v}&k=${k}&metric=${metric}&algo=${algo}`
  const res = await fetch(url)
  return res.json()
}

export async function insertVector(metadata, category, embedding) {
  const res = await fetch(`${API}/insert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metadata, category, embedding })
  })
  return res.json()
}

export async function deleteVector(id) {
  const res = await fetch(`${API}/delete/${id}`, { method: 'DELETE' })
  return res.json()
}

export async function fetchBenchmark(v, k, metric) {
  const res = await fetch(`${API}/benchmark?v=${v}&k=${k}&metric=${metric}`)
  return res.json()
}

export async function fetchHnswInfo() {
  const res = await fetch(`${API}/hnsw-info`)
  return res.json()
}

export async function fetchStats() {
  const res = await fetch(`${API}/stats`)
  return res.json()
}

export async function fetchStatus() {
  const res = await fetch(`${API}/status`)
  return res.json()
}

export async function insertDocument(title, text) {
  const res = await fetch(`${API}/doc/insert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, text })
  })
  return res.json()
}

export async function fetchDocList() {
  const res = await fetch(`${API}/doc/list`)
  return res.json()
}

export async function deleteDocument(id) {
  const res = await fetch(`${API}/doc/delete/${id}`, { method: 'DELETE' })
  return res.json()
}

export async function searchDocuments(question, k) {
  const res = await fetch(`${API}/doc/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, k })
  })
  return res.json()
}

export async function askAI(question, k) {
  const res = await fetch(`${API}/doc/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, k })
  })
  return res.json()
}
