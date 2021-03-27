import { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import { Post } from "../store/PostsStore";

const mapPosts = (
	allPosts: FirebaseFirestoreTypes.QuerySnapshot<FirebaseFirestoreTypes.DocumentData>
) => {
	return allPosts.docs.map(
		(post) =>
			({
				...post.data(),
				postId: post.id,
				postedAt: (post.get(
					"postedAt"
				) as FirebaseFirestoreTypes.Timestamp)
					.toDate()
					.toISOString(),
			} as Post)
	);
};
export default mapPosts;
