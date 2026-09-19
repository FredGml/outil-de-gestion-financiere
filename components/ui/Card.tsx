
import React from 'react';

interface CardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  colorClass?: string;
}

const Card: React.FC<CardProps> = ({ title, value, icon, colorClass = 'text-primary-500' }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
      <div className={`p-3 rounded-full mr-4 ${colorClass} bg-opacity-10 ${colorClass.replace('text-','bg-')}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
};

export default Card;
