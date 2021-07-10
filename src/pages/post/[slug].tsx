/* eslint-disable react-hooks/rules-of-hooks */
import { useMemo, useCallback } from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { FiCalendar, FiUser, FiWatch } from 'react-icons/fi';
import { RichText } from 'prismic-dom';
import Prismic from '@prismicio/client';

import { useEffect } from 'react';
import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  edited: boolean;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
  previousPost: { uid: string; title: string };
  nextPost: { uid: string; title: string };
}

export default function Post({
  post,
  preview,
  previousPost,
  nextPost,
}: PostProps): JSX.Element {
  const router = useRouter();

  const readingTime = useMemo(() => {
    const numberOfWords = post?.data.content.reduce((accumulator, content) => {
      const reg = new RegExp(/[^a-zA-Z0-9]/g);

      const nOfWords = RichText.asText(content.body).split(reg).length;
      return accumulator + nOfWords;
    }, 0);

    return Math.ceil(numberOfWords / 200);
  }, [post]);

  const formatDate = useCallback(date => {
    return format(new Date(date), 'dd MMM yyyy', {
      locale: ptBR,
    });
  }, []);

  const formatWithTime = useCallback(date => {
    return format(new Date(date), "'* editado em 'dd MMM yyyy', às 'HH:mm", {
      locale: ptBR,
    });
  }, []);

  if (router.isFallback) {
    return <div>Carregando...</div>;
  }

  useEffect(() => {
    const script = document.createElement('script');
    const anchor = document.getElementById('inject-comments-for-uterances');

    script.src = 'https://utteranc.es/client.js';
    script.crossOrigin = 'anonymous';
    script.async = true;

    script.setAttribute('repo', 'rafael399/ignite-react-desafio05');
    script.setAttribute('issue-term', 'pathname');
    script.setAttribute('theme', 'github-dark');
    script.setAttribute('label', 'blog-comment');
    anchor.appendChild(script);
  }, []);

  return (
    <>
      <Head>
        <title>{post.data.title} | Ignews</title>
      </Head>

      <Header />

      <img className={styles.banner} src={post.data.banner.url} alt="banner" />

      <main className={commonStyles.container}>
        <article className={styles.post}>
          <h1>{post.data.title}</h1>
          <section>
            <time>
              <FiCalendar size={20} />
              {formatDate(post.first_publication_date)}
            </time>{' '}
            <section>
              <FiUser size={20} />
              {post.data.author}
            </section>
            <section>
              <FiWatch size={20} />
              {readingTime} min
            </section>
          </section>

          {post.edited && (
            <section className={styles.edited}>
              <em>{formatWithTime(post.last_publication_date)}</em>
            </section>
          )}

          {post.data.content.map(cont => (
            <div className={styles.postContent} key={cont.body[0].text.length}>
              <h2>{cont.heading}</h2>

              <div
                className={styles.postContent}
                dangerouslySetInnerHTML={{ __html: RichText.asHtml(cont.body) }}
              />
            </div>
          ))}

          <hr className={styles.separator} />

          {(previousPost || nextPost) && (
            <div className={styles.navPosts}>
              {previousPost ? (
                <Link href={`/post/${previousPost.uid}`}>
                  <a className={styles.prevPost}>
                    {previousPost.title}
                    <strong>Previous Post</strong>
                  </a>
                </Link>
              ) : (
                <span />
              )}

              {nextPost && (
                <Link href={`/post/${nextPost.uid}`}>
                  <a className={styles.nextPost}>
                    {nextPost.title}
                    <strong>Next Post</strong>
                  </a>
                </Link>
              )}
            </div>
          )}

          <div id="inject-comments-for-uterances" />

          {preview && (
            <aside className={commonStyles.previewButton}>
              <Link href="/api/exit-preview">
                <a>Sair do modo Preview</a>
              </Link>
            </aside>
          )}
        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();

  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['criando-um-app-cra-do-zero'],
    }
  );

  const paths = posts.results.map(post => {
    return { params: { slug: post.uid } };
  });

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps<PostProps> = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    edited: Boolean(
      response.first_publication_date !== response.last_publication_date
    ),
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content,
    },
  };

  const previousPostResponse = (
    await prismic.query(
      Prismic.predicates.dateBefore(
        'document.first_publication_date',
        response.first_publication_date
      ),
      { orderings: '[document.first_publication_date]' }
    )
  ).results.pop();

  const previousPost = previousPostResponse?.uid
    ? {
        uid: previousPostResponse.uid,
        title: previousPostResponse.data.title,
      }
    : null;

  const nextPostResponse = (
    await prismic.query(
      Prismic.predicates.dateAfter(
        'document.first_publication_date',
        response.first_publication_date
      ),
      { orderings: '[document.first_publication_date]' }
    )
  ).results[0];

  const nextPost = nextPostResponse?.uid
    ? {
        uid: nextPostResponse.uid,
        title: nextPostResponse.data.title,
      }
    : null;

  return {
    props: { post, preview, previousPost, nextPost },
  };
};
