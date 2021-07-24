import React, { useContext, useState } from "react";
import {
	BackHandler,
	RefreshControl,
	StatusBar,
	ToastAndroid,
	View,
} from "react-native";
import {
	Appbar,
	Caption,
	Divider,
	IconButton,
	Paragraph,
	Text,
	useTheme,
	TextInput,
} from "react-native-paper";
import { format, formatDistanceToNow } from "date-fns";

import { AppContext } from "../../utils/appContext";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { PostStackParamsList } from "../../types/navigation/PostStack";
import { FlatList } from "react-native-gesture-handler";
import { UserAvatar } from "../../Components/UserAvatar";
import { CommentItem } from "./CommentItem";
import { useMutation, useQuery } from "react-query";
import { addComment, deleteComment, getCommentsOnPost } from "../../../api";
import { definitions } from "../../types/supabase";
import { CommentFull } from "../../types";
import { queryClient } from "../../utils/queryClient";

type Props = {
	route: RouteProp<PostStackParamsList, "Comments">;
	navigation: StackNavigationProp<PostStackParamsList, "Comments">;
};

const Comments: React.FC<Props> = ({ route, navigation }) => {
	const { colors } = useTheme();
	const { user: currentUser } = useContext(AppContext);

	const [commentText, setCommentText] = useState("");

	const { data, isLoading, refetch } = useQuery(
		`commentsOnPost_${route.params.post.postId}`,
		() => getCommentsOnPost(route.params.post.postId)
	);
	const [selectedComment, setSelectedComment] = useState<number | null>(null);

	useFocusEffect(
		React.useCallback(() => {
			const onBackPress = () => {
				if (selectedComment) {
					setSelectedComment(null);
					return true;
				}
			};

			BackHandler.addEventListener("hardwareBackPress", onBackPress);

			return () =>
				BackHandler.removeEventListener(
					"hardwareBackPress",
					onBackPress
				);
		}, [selectedComment])
	);

	const newCommentMutation = useMutation<
		CommentFull | null,
		unknown,
		Pick<definitions["comments"], "comment" | "postId" | "user">
	>((newComment) => addComment(newComment), {
		onMutate: async (addedComment) => {
			await queryClient.cancelQueries(
				`commentsOnPost_${route.params.post.postId}`
			);
			const previousComments = queryClient.getQueryData<
				CommentFull[] | null | undefined
			>(`commentsOnPost_${route.params.post.postId}`);

			if (!currentUser) return { previousComments };

			// Optimistically update to the new value
			if (previousComments) {
				queryClient.setQueryData<CommentFull[]>(
					`commentsOnPost_${route.params.post.postId}`,
					[
						...previousComments,
						{
							comment: addedComment.comment,
							id: Math.random(),
							postId: addedComment.postId,
							postedAt: new Date().toISOString(),
							user: {
								name: currentUser?.name,
								username: currentUser?.username,
								profilePic: currentUser?.profilePic,
							},
						},
					]
				);
			}
			return { previousComments };
		},
		// Always refetch after error or success:
		onSettled: () => {
			queryClient.invalidateQueries(
				`commentsOnPost_${route.params.post.postId}`
			);
		},
	});

	const deleteCommentMutation = useMutation<boolean | null, unknown, number>(
		(commentToDelete) => deleteComment(commentToDelete),
		{
			onMutate: async (deletedComment) => {
				await queryClient.cancelQueries(
					`commentsOnPost_${route.params.post.postId}`
				);
				const previousComments = queryClient.getQueryData<
					CommentFull[] | null | undefined
				>(`commentsOnPost_${route.params.post.postId}`);

				if (!currentUser) return { previousComments };

				// Optimistically update to the new value
				if (previousComments) {
					queryClient.setQueryData<CommentFull[]>(
						`commentsOnPost_${route.params.post.postId}`,
						previousComments.filter(
							(item) => item.id !== deletedComment
						)
					);
				}
				return { previousComments };
			},
			// Always refetch after error or success:
			onSettled: () => {
				queryClient.invalidateQueries(
					`commentsOnPost_${route.params.post.postId}`
				);
			},
		}
	);

	const newComment = () => {
		if (
			commentText.length === 0 ||
			!route.params.post.postId ||
			!currentUser
		)
			return;
		try {
			newCommentMutation.mutate({
				comment: commentText,
				postId: route.params.post.postId,
				user: currentUser.username,
			});
			setCommentText("");
		} catch (err) {
			console.error("[addComment]", err);
			ToastAndroid.show("An error occured", ToastAndroid.LONG);
		}
	};

	const selectComment = (username: string, commentId: number) => {
		if (username === currentUser?.username) setSelectedComment(commentId);
	};

	const goBack = () => {
		if (selectedComment) {
			setSelectedComment(null);
		} else {
			navigation.goBack();
		}
	};

	const removeComment = () => {
		if (selectedComment) deleteCommentMutation.mutate(selectedComment);
		setSelectedComment(null);
	};

	return (
		<View
			style={{
				flex: 1,
			}}
		>
			<StatusBar
				backgroundColor="black"
				barStyle="light-content"
				animated
			/>
			<View
				style={{
					backgroundColor: colors.surface,
					flex: 1,
				}}
			>
				<Appbar.Header
					style={{
						backgroundColor: selectedComment ? "#009688" : "black",
					}}
				>
					<Appbar.BackAction onPress={goBack} />
					<Appbar.Content title="Comments" />
					{selectedComment && (
						<Appbar.Action icon="delete" onPress={removeComment} />
					)}
				</Appbar.Header>

				<FlatList
					ListHeaderComponent={
						<>
							<View
								style={{
									display: "flex",
									flexDirection: "row",
									alignItems: "center",
									margin: 16,
								}}
							>
								<UserAvatar
									profilePicture={
										route.params?.user?.profilePic
									}
								/>
								<View
									style={{
										marginHorizontal: 16,
									}}
								>
									<Text
										style={{
											fontSize: 16,
											fontWeight: "bold",
										}}
									>
										{route.params?.user?.username}
									</Text>
									<Paragraph>
										{route.params?.post?.caption}
									</Paragraph>
									<Caption>
										{new Date(
											route.params?.post?.postedAt
										).getTime() >
										new Date().getTime() -
											1 * 24 * 60 * 60 * 1000
											? `${formatDistanceToNow(
													new Date(
														route.params?.post?.postedAt
													)
											  )} ago`
											: format(
													new Date(
														route.params?.post?.postedAt
													),
													"LLLL dd, yyyy"
											  )}
									</Caption>
								</View>
							</View>
							<Divider />
						</>
					}
					data={data?.sort(
						(a, b) =>
							new Date(b.postedAt).getTime() -
							new Date(a.postedAt).getTime()
					)}
					refreshControl={
						<RefreshControl
							refreshing={isLoading}
							onRefresh={refetch}
						/>
					}
					ItemSeparatorComponent={Divider}
					renderItem={({ item }) => (
						<CommentItem
							item={item}
							selectComment={selectComment}
							selectedComment={selectedComment}
						/>
					)}
					keyExtractor={(item) => item.id}
					bouncesZoom
					bounces
					snapToAlignment={"start"}
					showsVerticalScrollIndicator
					style={{
						backgroundColor: colors.background,
					}}
				/>
			</View>
			<View
				style={{
					display: "flex",
					flexDirection: "row",
					backgroundColor: "#2f2f2f",
					alignItems: "center",
				}}
			>
				<TextInput
					value={commentText}
					onChangeText={(text) => setCommentText(text)}
					placeholder="Add a comment"
					onSubmitEditing={newComment}
					style={{
						flexGrow: 1,
						backgroundColor: "#2f2f2f",
						color: "white",
					}}
				/>
				<IconButton
					onPress={newComment}
					icon="send"
					style={{
						backgroundColor: "transparent",
					}}
				/>
			</View>
		</View>
	);
};

export default Comments;
