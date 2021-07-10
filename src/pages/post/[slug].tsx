import { useState, useEffect } from 'react';
import { GetStaticPaths, GetStaticPathsResult, GetStaticProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { FiCalendar, FiUser, FiWatch } from 'react-icons/fi';
import { RichText } from 'prismic-dom';
import Prismic from '@prismicio/client';

import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
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
}

export default function Post({ post }: PostProps): JSX.Element {
  const [readingTime, setReadingTime] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const numberOfWords = post?.data.content.reduce((accumulator, content) => {
      const nOfWords = RichText.asText(content.body).length;
      return accumulator + nOfWords;
    }, 0);

    setReadingTime(Math.ceil(numberOfWords / 200));
  }, [post]);

  if (router.isFallback) {
    return <div>Carregando...</div>;
  }

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
              {post.first_publication_date}
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

          {post.data.content.map(cont => (
            <div className={styles.postContent} key={cont.body.length}>
              <h2>{cont.heading}</h2>

              <div
                className={styles.postContent}
                dangerouslySetInnerHTML={{ __html: RichText.asHtml(cont.body) }}
              />
            </div>
          ))}
        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async (): Promise<
  GetStaticPathsResult<{
    slug: string;
  }>
> => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: [],
      pageSize: 1,
    }
  );

  return {
    paths: [{ params: { slug: posts.results[0].uid } }],
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async (
  context
): Promise<{ props: PostProps }> => {
  const { slug } = context.params;
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  const post: Post = {
    first_publication_date: format(
      new Date(response.first_publication_date),
      'dd MMM yyyy',
      {
        locale: ptBR,
      }
    ),
    data: {
      title: response.data.title,
      banner: {
        url: response.url,
      },
      author: response.data.author,
      content: response.data.content,
    },
  };

  console.log(JSON.stringify(post, null, 2));

  return {
    props: { post },
  };
};
