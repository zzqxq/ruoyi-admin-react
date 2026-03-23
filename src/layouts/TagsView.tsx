import { Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { RouteConfig } from '../router/routes';

export default function TagsView({
  tabs,
  activePath,
  onClose
}: {
  tabs: RouteConfig[]
  activePath: string
  onClose: (path: string) => void
}) {
  const navigate = useNavigate();

  return (
    <div className="h-10 bg-white border-b border-gray-200 flex items-center px-4 gap-2 shadow-sm overflow-x-auto shrink-0 hide-scrollbar">
      {tabs.map((tab) => {
        const isActive = tab.path === activePath;

        return (
          <Tag
            key={tab.path}
            color={isActive ? 'blue' : 'default'}
            closable={tabs.length > 1}
            onClose={(e) => {
              e.preventDefault();
              onClose(tab.path);
            }}
            onClick={() => navigate(tab.path)}
            className={`
              cursor-pointer px-3 py-1 text-sm border flex items-center
              rounded-md transition-all duration-150
              ${isActive
                ? 'border-blue-300 bg-blue-50 text-blue-600'
                : 'border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-800'}
            `}
            style={{ margin: 0 }}
          >
            {isActive && (
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
            )}
            <span className="whitespace-nowrap">
              {tab.title}
            </span>
          </Tag>
        );
      })}
    </div>
  );
}