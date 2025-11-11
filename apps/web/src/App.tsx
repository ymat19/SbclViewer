import { useState } from 'react';
import type { User, Task } from '@sbcl-viewer/shared';
import { TaskStatus } from '@sbcl-viewer/shared';
import './App.css';

function App() {
  const [user] = useState<User>({
    id: '1',
    name: 'サンプルユーザー',
    email: 'user@example.com',
    createdAt: new Date(),
  });

  const [tasks] = useState<Task[]>([
    {
      id: '1',
      title: 'データベースのバックアップ',
      description: '日次バックアップタスク',
      status: TaskStatus.PENDING,
      userId: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      title: 'レポート生成',
      description: '週次レポートの生成',
      status: TaskStatus.IN_PROGRESS,
      userId: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>SBCL Viewer</h1>

      <section style={{ marginBottom: '30px' }}>
        <h2>ユーザー情報</h2>
        <p>
          <strong>名前:</strong> {user.name}
        </p>
        <p>
          <strong>メール:</strong> {user.email}
        </p>
      </section>

      <section>
        <h2>タスク一覧</h2>
        {tasks.map((task) => (
          <div
            key={task.id}
            style={{
              border: '1px solid #ccc',
              padding: '15px',
              marginBottom: '10px',
              borderRadius: '5px',
            }}
          >
            <h3>{task.title}</h3>
            <p>
              <strong>ステータス:</strong> {task.status}
            </p>
            <p>{task.description}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

export default App;
