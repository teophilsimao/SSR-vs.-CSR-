import React from 'react'
import Link from 'next/link'

const Home = () => {
  return (
    <div className='flex flex-col items-center justify-center min-h-screen p-4 text-center'>
      <h1 className='text-4xl font-bold mb-8'>SSR vs CSR</h1>
      <p className='text-lg mb-8 max-w-2xl'>
      This project compares Server-Side Rendering (SSR) and Client-Side Rendering (CSR) 
      for content-heavy applications, measuring performance metrics like TTFB, LCP, and INP.
      </p>
      <div className='flex gap-4'>
        <Link
            href="/ssr"
            className='bg-blue-500 hover:bg-blue-600
             text-white py-3 rounded-lg font-medium no-underline'
        >
            SSR Implementation
        </Link>
        <Link
            href="/csr"
            className='bg-green-500 hover:bg-green-600
             text-white py-3 rounded-lg font-medium no-underline'
        >
            CSR Implementation
        </Link>
      </div>
    </div>
  )
}

export default Home
