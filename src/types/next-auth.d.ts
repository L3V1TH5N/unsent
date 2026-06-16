import { DefaultSession, DefaultUser } from 'next-auth'
import { AdapterUser } from '@auth/core/adapters'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      anonymousName: string | null
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    anonymousName?: string | null
  }
}

declare module '@auth/core/adapters' {
  interface AdapterUser {
    anonymousName?: string | null
  }
}