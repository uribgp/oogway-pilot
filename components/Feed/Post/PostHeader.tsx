import React, { FC } from 'react'
import needsHook from '../../../hooks/needsHook'
import { db, storage } from '../../../firebase'
import PostOptionsDropdown from './PostOptionsDropdown'
import { Avatar } from '@mui/material'
import { postCardClass } from '../../../styles/feed'
import bull from '../../Utils/Bullet'
import Timestamp from '../../Utils/Timestamp'
import { getUserDoc } from '../../../lib/userHelper'
import { getCommentsCollection } from '../../../lib/commentsHelper'
import { getPost } from '../../../lib/postsHelper'
import { deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { useProfileData } from '../../../hooks/useProfileData'

type PostHeaderProps = {
    id: string
    authorUid: string
    name: string
    timestamp: Date | null
}

const PostHeader: FC<PostHeaderProps> = ({
    id,
    name,
    authorUid,
    timestamp,
}) => {
    // Listen to real time author profile data
    const [authorProfile] = useProfileData(authorUid)

    // Delete the post entry from the DB.
    // Note: this post should NOT have any comments
    const deletePostEntry = async () => {
        const postDocRef = doc(db, 'posts', id)
        await deleteDoc(postDocRef).catch((err) => {
            console.log('Cannot delete post: ', err)
        })

        // Update the user's posts list
        const authorUserDoc = getUserDoc(authorUid)
        await authorUserDoc.then(async (doc) => {
            if (doc?.exists()) {
                let tmp = doc.data()
                delete tmp.posts[id]
                await updateDoc(doc.ref, tmp)
            }
        })

        // Delete the post's media, if any
        storage
            .ref(`posts/${id}`)
            .listAll()
            .then((listResults) => {
                const promises = listResults.items.map((item) => {
                    return item.delete()
                })
                Promise.all(promises)
            })
    }

    // Deletes a post
    const deletePost = () => {
        const postDoc = getPost(id)
        // Before deleting the post, we need to delete the comments.
        // Comments is a sub-collection of the post, so we need to
        // retrieve all comments and delete them first.
        postDoc.then(() => {
            // Check if comments exists for this post
            const commentsCollection = getCommentsCollection(id)
            commentsCollection
                .then((sub) => {
                    if (sub.docs.length > 0) {
                        // Comments are present, delete them
                        sub.forEach((com) => {
                            com.ref.delete() // Check if issue with getDoc vs get in helpers
                        })
                    }

                    // Proceed to delete the post
                    deletePostEntry()
                })
                .catch((err) => {
                    console.log('Cannot delete comments: ', err)
                })
        })
    }

    return (
        <div className={postCardClass.header}>
            {/* Left content */}
            <div className={postCardClass.headerLeft}>
                {/* Avatar */}
                <Avatar
                    onClick={needsHook}
                    className={postCardClass.avatar}
                    src={
                        authorProfile.profilePic
                            ? authorProfile.profilePic
                            : null
                    }
                />

                {/* Split into two rows on mobile */}
                <div className={postCardClass.infoDiv}>
                    <div className={postCardClass.leftMobileRowOne}>
                        {/* User Name */}
                        <span className="pl-sm font-bold">
                            {authorProfile.username
                                ? authorProfile.username
                                : name}
                        </span>
                    </div>
                    <div className={postCardClass.leftMobileRowTwo}>
                        {/* TODO: interpolate post category below */}
                        {/* <p className={postCardClass.categoryP}>Education</p>
                        {bull} */}
                        {/* Time stamp */}
                        <Timestamp timestamp={timestamp} />
                    </div>
                </div>
            </div>

            {/* Right: More Button */}
            <div className={postCardClass.headerRight}>
                <PostOptionsDropdown
                    authorUid={authorUid}
                    authorName={
                        authorProfile.username ? authorProfile.username : name
                    }
                    deletePost={deletePost}
                />
            </div>
        </div>
    )
}

export default PostHeader
