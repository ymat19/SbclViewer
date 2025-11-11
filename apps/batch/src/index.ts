import { User, Task, TaskStatus, ApiResponse } from '@sbcl-viewer/shared';

// バッチ処理のメイン関数
async function main() {
  console.log('バッチ処理を開始します...');

  // サンプルユーザーの作成
  const users: User[] = [
    {
      id: '1',
      name: 'ユーザー1',
      email: 'user1@example.com',
      createdAt: new Date(),
    },
    {
      id: '2',
      name: 'ユーザー2',
      email: 'user2@example.com',
      createdAt: new Date(),
    },
  ];

  console.log(`\n${users.length}人のユーザーを処理します`);

  // サンプルタスクの作成
  const tasks: Task[] = [
    {
      id: '1',
      title: 'データベースのバックアップ',
      description: '日次バックアップタスク',
      status: TaskStatus.PENDING,
      userId: users[0].id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      title: 'レポート生成',
      description: '週次レポートの生成',
      status: TaskStatus.IN_PROGRESS,
      userId: users[1].id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '3',
      title: 'データクリーニング',
      description: '不要なデータの削除',
      status: TaskStatus.PENDING,
      userId: users[0].id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // タスクの処理
  console.log(`\n${tasks.length}個のタスクを処理中...`);
  let successCount = 0;
  let failureCount = 0;

  for (const task of tasks) {
    const result = await processTask(task);
    if (result.success) {
      successCount++;
      console.log(`✓ タスク "${task.title}" を処理しました (${task.status} → COMPLETED)`);
    } else {
      failureCount++;
      console.error(`✗ タスク "${task.title}" の処理に失敗: ${result.error}`);
    }
  }

  console.log('\n--- 処理結果 ---');
  console.log(`成功: ${successCount}件`);
  console.log(`失敗: ${failureCount}件`);
  console.log('\nバッチ処理が完了しました');
}

// タスク処理関数
async function processTask(task: Task): Promise<ApiResponse<Task>> {
  try {
    // 実際の処理をシミュレート
    await new Promise((resolve) => setTimeout(resolve, 100));

    // タスクのステータスを更新
    const updatedTask: Task = {
      ...task,
      status: TaskStatus.COMPLETED,
      updatedAt: new Date(),
    };

    return {
      success: true,
      data: updatedTask,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    };
  }
}

// バッチ処理を実行
main().catch((error) => {
  console.error('バッチ処理でエラーが発生しました:', error);
  process.exit(1);
});
