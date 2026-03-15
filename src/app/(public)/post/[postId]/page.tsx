'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { PostDetail } from '@/components/post';
import { Card } from '@/components/common';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useTheme } from '@/providers';
import type { Post, Comment } from '@/types';

export default function PostDetailPage({ params }: { params: { postId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTheme();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const noCache = searchParams.get('noCache') === 'true';
        const url = `/api/posts/${params.postId}${noCache ? '?noCache=true' : ''}`;

        const [postResponse, commentsResponse] = await Promise.all([
          fetch(url, {
            cache: noCache ? 'no-store' : 'default',
            headers: noCache ? {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            } : {}
          }),
          fetch(`/api/comments?post_id=${params.postId}&limit=50&offset=0`, {
            cache: 'no-store',
          }),
        ]);

        if (!postResponse.ok) {
          if (postResponse.status === 404) {
            setError('Post not found');
          } else {
            setError('Failed to load post');
          }
          console.error('Failed to fetch post:', postResponse.status, postResponse.statusText);
          return;
        }

        const postData = await postResponse.json();

        if (postData.post) {
          setPost(postData.post);
        } else {
          setError('Post data not available');
          console.error('Post data not found in response:', postData);
          return;
        }

        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json();
          setComments(commentsData.comments || []);
        } else {
          setComments([]);
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        setError('An error occurred while loading the post');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.postId) {
      fetchPost();
    }
  }, [params.postId, searchParams]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
        </div>
      </MainLayout>
    );
  }

  if (error || !post) {
    return (
      <MainLayout>
        <div className="py-6 px-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-dark dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">{t('back')}</span>
          </button>
          <Card className="text-center py-12">
            <p className="text-gray-500">{error || 'Post not found'}</p>
            <button
              onClick={() => router.push('/home')}
              className="mt-4 text-primary-500 hover:text-primary-600 font-medium"
            >
              Back to Home
            </button>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const handlePostUpdate = (updatedPost: Post) => {
    setPost(updatedPost);
  };

  const handleCommentAdded = (newComment: Comment) => {
    setComments((prev) => [newComment, ...prev]);
    setPost((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        comments_count: (prev.comments_count || 0) + 1,
      };
    });
  };

  const handlePostDelete = () => {
    router.push('/home');
  };

  return (
    <MainLayout>
      <div className="py-6 px-4">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-dark dark:hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">{t('back')}</span>
        </button>
        <PostDetail 
          post={post} 
          comments={comments}
          onCommentAdded={handleCommentAdded}
          onUpdate={handlePostUpdate}
          onDelete={handlePostDelete}
        />
      </div>
    </MainLayout>
  );
}
