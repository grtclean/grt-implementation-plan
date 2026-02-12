/**
 * 协作编辑器组件
 * 
 * 功能：
 * 1. 实时多人编辑
 * 2. 光标位置显示
 * 3. 在线用户列表
 * 4. 编辑历史
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useCollaboration } from '@/hooks/useCollaboration';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Circle, 
  Save, 
  Undo, 
  Redo, 
  Users, 
  Wifi, 
  WifiOff,
  FileText,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface CollaborativeEditorProps {
  workspaceId: number;
  documentId: number;
  documentName: string;
  userId: number;
  userName: string;
  initialContent?: string;
  onSave?: (content: string) => void;
  readOnly?: boolean;
}

export default function CollaborativeEditor({
  workspaceId,
  documentId,
  documentName,
  userId,
  userName,
  initialContent = '',
  onSave,
  readOnly = false,
}: CollaborativeEditorProps) {
  const [localContent, setLocalContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ line: 0, column: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 使用协作hook
  const {
    isConnected,
    connectionError,
    onlineUsers,
    cursors,
    content: remoteContent,
    version,
    sendEdit,
    sendCursor,
  } = useCollaboration({
    workspaceId,
    documentId,
    userId,
    userName,
    onContentChange: (content, ver) => {
      // 当远程内容更新时，合并到本地
      // 实际实现需要使用OT或CRDT算法处理冲突
      if (content && content !== localContent) {
        setLocalContent(content);
      }
    },
  });

  // 计算光标位置
  const calculateCursorPosition = useCallback((text: string, selectionStart: number) => {
    const lines = text.substring(0, selectionStart).split('\n');
    return {
      line: lines.length - 1,
      column: lines[lines.length - 1].length,
    };
  }, []);

  // 处理内容变化
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const oldContent = localContent;
    setLocalContent(newContent);

    // 计算差异并发送编辑操作
    const position = calculateCursorPosition(newContent, e.target.selectionStart);
    
    if (newContent.length > oldContent.length) {
      // 插入操作
      const insertedText = newContent.substring(oldContent.length);
      sendEdit({
        type: 'insert',
        position,
        text: insertedText,
      });
    } else if (newContent.length < oldContent.length) {
      // 删除操作
      sendEdit({
        type: 'delete',
        position,
        length: oldContent.length - newContent.length,
      });
    }

    // 自动保存（防抖）
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      handleAutoSave(newContent);
    }, 2000);
  }, [localContent, sendEdit, calculateCursorPosition]);

  // 处理光标位置变化
  const handleSelectionChange = useCallback(() => {
    if (textareaRef.current) {
      const position = calculateCursorPosition(
        textareaRef.current.value,
        textareaRef.current.selectionStart
      );
      setCursorPosition(position);
      sendCursor(position);
    }
  }, [calculateCursorPosition, sendCursor]);

  // 自动保存
  const handleAutoSave = useCallback(async (content: string) => {
    if (onSave && !readOnly) {
      setIsSaving(true);
      try {
        await onSave(content);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsSaving(false);
      }
    }
  }, [onSave, readOnly]);

  // 手动保存
  const handleManualSave = useCallback(async () => {
    if (onSave && !readOnly) {
      setIsSaving(true);
      try {
        await onSave(localContent);
        setLastSaved(new Date());
        toast.success('文档已保存');
      } catch (error) {
        toast.error('保存失败');
      } finally {
        setIsSaving(false);
      }
    }
  }, [onSave, localContent, readOnly]);

  // 清理
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // 渲染远程光标
  const renderRemoteCursors = () => {
    return cursors
      .filter(c => c.userId !== userId)
      .map(cursor => (
        <div
          key={cursor.userId}
          className="absolute pointer-events-none"
          style={{
            // 简化版：实际需要根据文本计算精确位置
            top: `${cursor.position.line * 24 + 8}px`,
            left: `${cursor.position.column * 8 + 12}px`,
          }}
        >
          <div
            className="w-0.5 h-5 animate-pulse"
            style={{ backgroundColor: cursor.color }}
          />
          <div
            className="text-xs px-1 rounded -mt-1"
            style={{ backgroundColor: cursor.color, color: 'white' }}
          >
            {cursor.userName}
          </div>
        </div>
      ));
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{documentName}</CardTitle>
            {isConnected ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <Wifi className="h-3 w-3 mr-1" />
                已连接
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-600 border-red-600">
                <WifiOff className="h-3 w-3 mr-1" />
                离线
              </Badge>
            )}
            {isSaving && (
              <Badge variant="secondary">
                <Circle className="h-2 w-2 mr-1 animate-pulse fill-current" />
                保存中...
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* 在线用户 */}
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="flex -space-x-2">
                {onlineUsers.slice(0, 5).map(user => (
                  <Avatar key={user.userId} className="h-6 w-6 border-2 border-background">
                    <AvatarFallback className="text-xs">
                      {user.userName[0]}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {onlineUsers.length > 5 && (
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                    +{onlineUsers.length - 5}
                  </div>
                )}
              </div>
            </div>
            <Separator orientation="vertical" className="h-6" />
            {/* 操作按钮 */}
            <Button variant="ghost" size="icon" disabled>
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" disabled>
              <Redo className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleManualSave}
              disabled={isSaving || readOnly}
            >
              <Save className="h-4 w-4 mr-1" />
              保存
            </Button>
          </div>
        </div>
        {/* 状态栏 */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
          <div className="flex items-center gap-4">
            <span>行 {cursorPosition.line + 1}, 列 {cursorPosition.column + 1}</span>
            <span>版本 {version}</span>
          </div>
          {lastSaved && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>上次保存: {lastSaved.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 relative">
        {connectionError && (
          <div className="absolute top-0 left-0 right-0 bg-red-100 text-red-800 text-sm p-2 z-10">
            {connectionError}
          </div>
        )}
        <div className="relative h-full">
          {/* 远程光标 */}
          {renderRemoteCursors()}
          {/* 编辑器 */}
          <Textarea
            ref={textareaRef}
            value={localContent}
            onChange={handleContentChange}
            onSelect={handleSelectionChange}
            onKeyUp={handleSelectionChange}
            onClick={handleSelectionChange}
            className="h-full min-h-[400px] resize-none border-0 rounded-none focus-visible:ring-0 font-mono text-sm"
            placeholder="开始编辑文档..."
            readOnly={readOnly}
          />
        </div>
      </CardContent>
    </Card>
  );
}
