import React from 'react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'ホーム', icon: '🏠' },
  { to: '/rounds', label: 'ラウンド', icon: '📋' },
  { to: '/rounds/new', label: '追加', icon: '➕' },
  { to: '/analysis', label: '分析', icon: '📊' },
  { to: '/guide', label: 'ガイド', icon: '📖' },
  { to: '/settings', label: '設定', icon: '⚙️' },
]

export default function Navigation() {
  return (
    <nav className="bottom-nav">
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `bottom-nav-item${isActive ? ' active' : ''}`
          }
          end={item.to === '/'}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
