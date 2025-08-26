import React from 'react';

interface ProjectDateBoardProps {
  project: any;
}

export function ProjectDateBoard({ project }: ProjectDateBoardProps) {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Project Date Board: {project.title}</h2>
      <div className="text-gray-600">
        Navigation wird geladen... 
        <br />
        <small>Datum-Board wird repariert</small>
      </div>
    </div>
  );
} 