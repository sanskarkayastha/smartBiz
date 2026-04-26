'use client'

import { useActionState, useState } from 'react'
import { login, signup } from '@/app/actions/auth'

export default function LoginPage() {
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [loginError, loginAction, loginPending] = useActionState(login, null)
  const [signupError, signupAction, signupPending] = useActionState(signup, null)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600">SmartBiz</h1>
          <p className="text-gray-500 mt-1 text-sm">Business management for Nepal</p>
        </div>

        <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
          <button
            onClick={() => setTab('login')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              tab === 'login' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setTab('signup')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              tab === 'signup' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sign Up
          </button>
        </div>

        {tab === 'login' ? (
          <form action={loginAction} className="space-y-4">
            {loginError && (
              <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {loginError}
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email" name="email" required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password" name="password" required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit" disabled={loginPending}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg transition-colors"
            >
              {loginPending ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form action={signupAction} className="space-y-4">
            {signupError && (
              <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {signupError}
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text" name="fullName" required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Raj Sharma"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email" name="email" required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password" name="password" required minLength={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Min. 6 characters"
              />
            </div>
            <button
              type="submit" disabled={signupPending}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg transition-colors"
            >
              {signupPending ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
