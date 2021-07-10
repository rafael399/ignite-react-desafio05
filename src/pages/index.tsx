import { useState, useEffect, useCallback } from 'react';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';

import { FiCalendar, FiUser } from 'react-icons/fi';
import Prismic from '@prismicio/client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
  preview: boolean;
}

export default function Home({
  postsPagination,
  preview,
}: HomeProps): JSX.Element {
  const [posts, setPosts] = useState<PostPagination>({} as PostPagination);

  useEffect(() => {
    setPosts(postsPagination);
  }, [postsPagination]);

  const formatDate = useCallback(date => {
    return format(new Date(date), 'dd MMM yyyy', {
      locale: ptBR,
    });
  }, []);

  const nextPage = (): void => {
    fetch(postsPagination.next_page)
      .then(response => response.json())
      .then(data => {
        const results = data.results.map((post: Post) => {
          return {
            uid: post.uid,
            first_publication_date: post.first_publication_date,
            data: {
              title: post.data.title,
              subtitle: post.data.subtitle,
              author: post.data.author,
            },
          };
        });

        const tmpPosts = {
          next_page: data.next_page,
          results: [...postsPagination.results, ...results],
        };

        setPosts(tmpPosts);
      });
  };

  return (
    <>
      <Head>
        <title>Home | Desafio05</title>
      </Head>

      <main className={commonStyles.container}>
        <div className={styles.posts}>
          <img src="./Logo.svg" alt="logo" />

          {posts.results?.map(post => (
            <Link href={`/post/${post.uid}`} key={post.uid}>
              <a>
                <strong>{post.data.title}</strong>
                <p>{post.data.subtitle}</p>
                <section>
                  <time>
                    <FiCalendar size={20} />
                    {formatDate(post.first_publication_date)}
                  </time>{' '}
                  <FiUser size={20} />
                  {post.data.author}
                </section>
              </a>
            </Link>
          ))}

          {posts.next_page && (
            <button type="button" onClick={() => nextPage()}>
              Carregar mais posts
            </button>
          )}

          {preview && (
            <aside className={commonStyles.previewButton}>
              <Link href="/api/exit-preview">
                <a>Sair do modo Preview</a>
              </Link>
            </aside>
          )}
        </div>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = async ({
  preview = false,
  previewData,
}) => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: [],
      pageSize: 2,
      ref: previewData?.ref ?? null,
    }
  );

  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });

  const postsPagination: PostPagination = {
    next_page: postsResponse.next_page,
    results: posts,
  };

  return {
    props: { postsPagination, preview },
  };
};
