// Debug script para verificar la carga de datos
import { blogPostsService } from './src/services/firestore';

const debugLoadBlogPost = async (postId) => {
  try {
    console.log('Debug: Loading blog post with ID:', postId);
    const data = await blogPostsService.getById(postId);
    console.log('Debug: Blog post data loaded:', data);
    return data;
  } catch (error) {
    console.error('Debug: Error loading blog post:', error);
    throw error;
  }
};

export default debugLoadBlogPost;

