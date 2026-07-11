'use client'

import { useState } from 'react'
import Sidebar from '../components/layout/Sidebar'
import Feed from '../components/social/Feed'
import StoriesBar from '../components/social/StoriesBar'
import TrendingHashtags from '../components/social/TrendingHashtags'
import SuggestedGroups from '../components/social/SuggestedGroups'
import SuggestedConnections from '../components/social/SuggestedConnections'
import MyNetworkPanel from '../components/social/MyNetworkPanel'
import Card from '../components/ui/Card'

export default function Social() {
  const [filter, setFilter] = useState('all')

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-[#1A1A1A] flex items-center justify-between px-6 bg-[#0A0A0A]/50 backdrop-blur-md sticky top-0 z-30">
          <h2 className="text-lg font-bold text-white tracking-tight">Social Network</h2>
          <div className="flex gap-2">
            {['all', 'verified', 'genius'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`
                  px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all
                  ${filter === f 
                    ? 'bg-[#D4AF37] text-[#0A0A0A]' 
                    : 'bg-[#111111] text-gray-500 border border-[#2a2a2a]'
                  }
                `}
              >
                {f}
              </button>
            ))}
          </div>
        </header>

        <div className="p-6 lg:p-10 max-w-7xl mx-auto w-full grid grid-cols-1 xl:grid-cols-12 gap-10">
          {/* Feed (Center) */}
          <div className="xl:col-span-8 space-y-6">
            <StoriesBar />
            <TrendingHashtags
              activeHashtag={filter.startsWith('#') ? filter : null}
              onSelect={(tag) => setFilter(tag === (filter.startsWith('#') ? filter : null) ? 'all' : tag)}
            />
            <Feed filter={filter} />
          </div>

          {/* Right Sidebar */}
          <div className="xl:col-span-4 space-y-10">
            <MyNetworkPanel />
            <SuggestedGroups />
            <SuggestedConnections />
          </div>
        </div>
      </main>
    </div>
  )
}
