import Image from "next/image";
import styles from "assets/styles/Home.module.css";
import imageSrc from "assets/images/home.webp";

function Home() {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <Image
          src={imageSrc}
          alt="Under Construction"
          width={500}
          height={300}
        />
        <h1 className={styles.title}>Em construção</h1>
      </main>
    </div>
  );
}

export default Home;
