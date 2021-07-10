import { useMemo, useCallback } from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
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

          {post.data.content.map(cont => (
            <div className={styles.postContent} key={cont.body[0].text.length}>
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

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();

  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['criando-um-app-cra-do-zero1'],
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

export const getStaticProps: GetStaticProps = async (
  context
): Promise<{ props: PostProps }> => {
  const { slug } = context.params;
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
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

  return {
    props: { post },
  };
};
