import React from 'react';
import { Sentiment, Urgency } from '../types';

interface BadgeProps {
  children: React.ReactNode;
  color?: 'gray' | 'red' | 'yellow' | 'green' | 'blue' | 'purple';
}

export const Badge: React.FC<BadgeProps> = ({ children, color = 'gray' }) => {
  const colors = {
    gray: "bg-gray-100 text-gray-800",
    red: "bg-red-100 text-red-800",
    yellow: "bg-yellow-100 text-yellow-800",
    green: "bg-green-100 text-green-800",
    blue: "bg-blue-100 text-blue-800",
    purple: "bg-purple-100 text-purple-800",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
};

export const SentimentBadge: React.FC<{ sentiment: Sentiment }> = ({ sentiment }) => {
  let color: BadgeProps['color'] = 'gray';
  
  switch(sentiment) {
    case Sentiment.VERY_POSITIVE:
    case Sentiment.POSITIVE:
      color = 'green';
      break;
    case Sentiment.NEGATIVE:
    case Sentiment.VERY_NEGATIVE:
      color = 'red';
      break;
    case Sentiment.NEUTRAL:
      color = 'gray';
      break;
  }
  
  return <Badge color={color}>{sentiment.replace('_', ' ').toUpperCase()}</Badge>;
};

export const UrgencyBadge: React.FC<{ urgency: Urgency }> = ({ urgency }) => {
  let color: BadgeProps['color'] = 'gray';
  
  switch(urgency) {
    case Urgency.HIGH:
      color = 'red';
      break;
    case Urgency.MEDIUM:
      color = 'yellow';
      break;
    case Urgency.LOW:
      color = 'blue';
      break;
  }
  
  return <Badge color={color}>{urgency.toUpperCase()}</Badge>;
};
