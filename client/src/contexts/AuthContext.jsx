import React, { createContext, useContext, useEffect, useState } from 'react'
import * as api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }){
  const [token, setToken] = useState(localStorage.getItem('ab_token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!token)

  useEffect(()=>{
    if (!token) { setUser(null); setLoading(false); return }
    let mounted = true
    api.me(token).then(res=>{
      if (!mounted) return
      setUser(res.user)
    }).catch(()=>{
      setToken(null)
      localStorage.removeItem('ab_token')
    }).finally(()=>mounted && setLoading(false))
    return ()=>{ mounted=false }
  }, [token])

  function saveToken(t){
    setToken(t)
    if (t) localStorage.setItem('ab_token', t)
    else localStorage.removeItem('ab_token')
  }

  return (
    <AuthContext.Provider value={{ token, saveToken, user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(){
  return useContext(AuthContext)
}
