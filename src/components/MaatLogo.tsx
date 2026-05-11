/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export const MaatLogo = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg 
    width="400" 
    height="400" 
    viewBox="0 0 400 400" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="200" cy="200" r="190" stroke="#1B365D" stroke-width="8"/>
    {/* Wings */}
    <path d="M50 200C50 140 100 80 200 80C300 80 350 140 350 200" stroke="#008080" stroke-width="12" stroke-linecap="round"/>
    <path d="M70 220C70 180 120 130 200 130C280 130 330 180 330 220" stroke="#008080" stroke-width="8" stroke-linecap="round"/>
    
    {/* Scale Body */}
    <rect x="195" y="160" width="10" height="150" fill="#D4AF37"/>
    <rect x="190" y="300" width="20" height="15" fill="#D4AF37"/>
    <path d="M100 200L300 200" stroke="#D4AF37" stroke-width="6"/>
    
    {/* Scale Pans */}
    <path d="M100 200L70 280H130L100 200Z" fill="#1B365D"/>
    <path d="M300 200L270 280H330L300 200Z" fill="#1B365D"/>
    
    {/* Heart and Feather Symbols in Pans */}
    <path d="M100 245C100 245 90 235 90 230C90 225 95 220 100 225C105 220 110 225 110 230C110 235 100 245 100 245Z" fill="#D4AF37"/>
    <path d="M300 225L295 250H305L300 225Z" fill="#D4AF37"/>
    
    {/* Maat Head/Feather Stylization (Simplified) */}
    <circle cx="200" cy="140" r="30" fill="#1B365D"/>
    <path d="M200 110V50" stroke="#D4AF37" stroke-width="4" stroke-linecap="round"/>
    <path d="M200 60C210 65 210 75 200 80C190 75 190 65 200 60Z" fill="#D4AF37"/>
  </svg>
);
